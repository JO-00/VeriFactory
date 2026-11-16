package indexer

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TopicKind string

const (
	TopicGatewayDocuments TopicKind = "gateway_documents"
	TopicInspectorReports TopicKind = "inspector_reports"
)

type hcsMessagesResponse struct {
	Messages []struct {
		ConsensusTimestamp string `json:"consensus_timestamp"`
		Message            string `json:"message"`
	} `json:"messages"`
	Links struct {
		Next *string `json:"next"`
	} `json:"links"`
}

type gatewayDocumentMsg struct {
	FacilityAddress string `json:"facilityAddress"`
	GatewayID       string `json:"gatewayId"`
	GatewayAddress  string `json:"gatewayAddress"`
	DocumentCID     string `json:"documentCID"`
	Signature       string `json:"signature"`
}

type inspectorReportMsg struct {
	InspectorAddress string `json:"inspectorAddress"`
	ReportCID        string `json:"reportCID"`
	Signature        string `json:"signature"`
	FacilityAddress  string `json:"facilityAddress"`
}

type HCSTopicPoller struct {
	pool          *pgxpool.Pool
	mirrorBaseURL *url.URL
	httpClient    *http.Client
	topicID       string
	kind          TopicKind
	pollInterval  time.Duration
}

func NewHCSTopicPoller(pool *pgxpool.Pool, mirrorNodeURL, topicID string, kind TopicKind, pollInterval time.Duration) (*HCSTopicPoller, error) {
	parsed, err := url.Parse(strings.TrimRight(mirrorNodeURL, "/"))
	if err != nil {
		return nil, fmt.Errorf("parse mirror node url: %w", err)
	}
	if pollInterval <= 0 {
		pollInterval = 3 * time.Second
	}
	return &HCSTopicPoller{
		pool:          pool,
		mirrorBaseURL: parsed,
		httpClient:    &http.Client{Timeout: 15 * time.Second},
		topicID:       strings.TrimSpace(topicID),
		kind:          kind,
		pollInterval:  pollInterval,
	}, nil
}

// Run polls the Mirror Node immediately on server startup and on every tick.
func (p *HCSTopicPoller) Run(ctx context.Context) {
	ticker := time.NewTicker(p.pollInterval)
	defer ticker.Stop()

	for {
		if err := p.SyncOnce(ctx); err != nil && ctx.Err() == nil {
			slog.Default().Error("HCS topic sync failed", "topicId", p.topicID, "error", err)
		}

		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (p *HCSTopicPoller) SyncOnce(ctx context.Context) error {
	lastTS, err := p.getLastTimestamp(ctx)
	if err != nil {
		return err
	}

	endpoint := *p.mirrorBaseURL
	endpoint.Path = strings.TrimRight(endpoint.Path, "/") + "/api/v1/topics/" + url.PathEscape(p.topicID) + "/messages"
	q := endpoint.Query()
	q.Set("order", "asc")
	q.Set("limit", "100")
	if lastTS != "" {
		q.Set("timestamp", "gt:"+lastTS)
	}
	endpoint.RawQuery = q.Encode()

	nextURL := endpoint.String()
	for nextURL != "" {
		if err := ctx.Err(); err != nil {
			return err
		}

		page, next, err := p.fetchPage(ctx, nextURL)
		if err != nil {
			return err
		}

		if len(page.Messages) > 0 {
			if err := p.saveBatch(ctx, page.Messages); err != nil {
				return err
			}
		}

		if next == nil || strings.TrimSpace(*next) == "" {
			break
		}
		rel, err := url.Parse(*next)
		if err != nil {
			return err
		}
		nextURL = p.mirrorBaseURL.ResolveReference(rel).String()
	}

	return nil
}

func (p *HCSTopicPoller) getLastTimestamp(ctx context.Context) (string, error) {
	var ts string
	err := p.pool.QueryRow(ctx, `
		SELECT last_consensus_timestamp
		FROM verifactory.hcs_topic_cursors
		WHERE topic_id = $1
	`, p.topicID).Scan(&ts)

	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("query cursor for topic %s: %w", p.topicID, err)
	}
	return ts, nil
}

func (p *HCSTopicPoller) fetchPage(ctx context.Context, reqURL string) (hcsMessagesResponse, *string, error) {
	var out hcsMessagesResponse

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return out, nil, err
	}
	req.Header.Set("Accept", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return out, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return out, nil, fmt.Errorf("mirror node HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return out, nil, err
	}
	return out, out.Links.Next, nil
}

func (p *HCSTopicPoller) saveBatch(ctx context.Context, msgs []struct {
	ConsensusTimestamp string `json:"consensus_timestamp"`
	Message            string `json:"message"`
}) error {
	tx, err := p.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(context.Background()) }()

	for _, m := range msgs {
		decoded, err := base64.StdEncoding.DecodeString(m.Message)
		if err != nil {
			continue
		}

		switch p.kind {
		case TopicGatewayDocuments:
			var payload gatewayDocumentMsg
			if err := json.Unmarshal(decoded, &payload); err != nil {
				continue
			}
			_, err = tx.Exec(ctx, `
				INSERT INTO verifactory.gateway_documents (
					topic_id, consensus_timestamp, facility_address, gateway_id, gateway_address, document_cid, signature
				) VALUES ($1, $2, LOWER($3), $4, LOWER($5), $6, $7)
				ON CONFLICT (topic_id, consensus_timestamp) DO NOTHING
			`, p.topicID, m.ConsensusTimestamp,
				strings.TrimSpace(payload.FacilityAddress),
				strings.TrimSpace(payload.GatewayID),
				strings.TrimSpace(payload.GatewayAddress),
				strings.TrimSpace(payload.DocumentCID),
				strings.TrimSpace(payload.Signature),
			)
			if err != nil {
				return err
			}

		case TopicInspectorReports:
			var payload inspectorReportMsg
			if err := json.Unmarshal(decoded, &payload); err != nil {
				continue
			}
			_, err = tx.Exec(ctx, `
				INSERT INTO verifactory.inspector_reports (
					topic_id, consensus_timestamp, facility_address, inspector_address, report_cid, signature
				) VALUES ($1, $2, LOWER($3), LOWER($4), $5, $6)
				ON CONFLICT (topic_id, consensus_timestamp) DO NOTHING
			`, p.topicID, m.ConsensusTimestamp,
				strings.TrimSpace(payload.FacilityAddress),
				strings.TrimSpace(payload.InspectorAddress),
				strings.TrimSpace(payload.ReportCID),
				strings.TrimSpace(payload.Signature),
			)
			if err != nil {
				return err
			}
		}
	}
	newestTS := msgs[len(msgs)-1].ConsensusTimestamp
	_, err = tx.Exec(ctx, `
		INSERT INTO verifactory.hcs_topic_cursors (topic_id, last_consensus_timestamp, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (topic_id) DO UPDATE SET
			last_consensus_timestamp = EXCLUDED.last_consensus_timestamp,
			updated_at = NOW()
	`, p.topicID, newestTS)
	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	slog.Info(
		"synced HCS topic batch",
		"topicId", p.topicID,
		"kind", p.kind,
		"count", len(msgs),
		"lastConsensusTimestamp", newestTS,
	)

	return nil
}
