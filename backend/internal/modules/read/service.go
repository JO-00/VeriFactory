package read

import (
	"context"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"veriFactory/backend/internal/database/sqlc"
)

type Service struct {
	repo           *Repository
	ipfsGatewayURL string
	httpClient     *http.Client
}

func NewService(repo *Repository) *Service {
	gateway := strings.TrimSpace(os.Getenv("IPFS_GATEWAY_URL"))
	if gateway == "" {
		gateway = "https://ipfs.io"
	}

	return &Service{
		repo:           repo,
		ipfsGatewayURL: strings.TrimRight(gateway, "/"),
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

type GatewayDocumentMessage struct {
	ID                 int64     `json:"id"`
	ConsensusTimestamp string    `json:"consensusTimestamp"`
	FacilityAddress    string    `json:"facilityAddress"`
	GatewayID          string    `json:"gatewayId"`
	GatewayAddress     string    `json:"gatewayAddress"`
	DocumentCID        string    `json:"documentCID"`
	IPFSExists         bool      `json:"ipfsExists"`
	Signature          string    `json:"signature"`
	CreatedAt          time.Time `json:"createdAt"`
}

type InspectorReportMessage struct {
	ID                 int64     `json:"id"`
	ConsensusTimestamp string    `json:"consensusTimestamp"`
	FacilityAddress    string    `json:"facilityAddress"`
	InspectorAddress   string    `json:"inspectorAddress"`
	ReportCID          string    `json:"reportCID"`
	IPFSExists         bool      `json:"ipfsExists"`
	Signature          string    `json:"signature"`
	CreatedAt          time.Time `json:"createdAt"`
}

func (s *Service) ListGatewayDocuments(ctx context.Context, facilityAddr, GatewayAddress string) ([]GatewayDocumentMessage, error) {
	rows, err := s.repo.ListGatewayDocuments(ctx, facilityAddr, GatewayAddress)
	if err != nil {
		return nil, err
	}

	out := make([]GatewayDocumentMessage, 0, len(rows))
	for _, r := range rows {
		out = append(out, GatewayDocumentMessage{
			ID:                 r.ID,
			ConsensusTimestamp: r.ConsensusTimestamp,
			FacilityAddress:    r.FacilityAddress,
			GatewayID:          r.GatewayID,
			GatewayAddress:     r.GatewayAddress,
			DocumentCID:        r.DocumentCid,
			Signature:          r.Signature,
			CreatedAt:          r.CreatedAt.Time,
		})
	}

	s.populateIPFSStatus(ctx, out)
	return out, nil
}

func (s *Service) QueryInspectorReports(ctx context.Context, facilityAddr, inspectorAddr string) ([]InspectorReportMessage, error) {
	var (
		rows []db.VerifactoryInspectorReport
		err  error
	)

	switch {
	case facilityAddr != "" && inspectorAddr != "":
		rows, err = s.repo.ListInspectorReportsByFacilityAndInspector(ctx, facilityAddr, inspectorAddr)
	case inspectorAddr != "":
		rows, err = s.repo.ListInspectorReportsByInspector(ctx, inspectorAddr)
	default:
		rows, err = s.repo.ListInspectorReportsByFacility(ctx, facilityAddr)
	}
	if err != nil {
		return nil, err
	}

	out := make([]InspectorReportMessage, 0, len(rows))
	for _, r := range rows {
		out = append(out, InspectorReportMessage{
			ID:                 r.ID,
			ConsensusTimestamp: r.ConsensusTimestamp,
			FacilityAddress:    r.FacilityAddress,
			InspectorAddress:   r.InspectorAddress,
			ReportCID:          r.ReportCid,
			Signature:          r.Signature,
			CreatedAt:          r.CreatedAt.Time,
		})
	}

	s.populateInspectorReportIPFSStatus(ctx, out)
	return out, nil
}

func (s *Service) ListAllGatewayDocuments(ctx context.Context) ([]GatewayDocumentMessage, error) {
	rows, err := s.repo.ListAllGatewayDocuments(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]GatewayDocumentMessage, 0, len(rows))
	for _, r := range rows {
		out = append(out, GatewayDocumentMessage{
			ID:                 r.ID,
			ConsensusTimestamp: r.ConsensusTimestamp,
			FacilityAddress:    r.FacilityAddress,
			GatewayID:          r.GatewayID,
			GatewayAddress:     r.GatewayAddress,
			DocumentCID:        r.DocumentCid,
			Signature:          r.Signature,
			CreatedAt:          r.CreatedAt.Time,
		})
	}

	s.populateIPFSStatus(ctx, out)
	return out, nil
}

func (s *Service) ListAllInspectorReports(ctx context.Context) ([]InspectorReportMessage, error) {
	rows, err := s.repo.ListAllInspectorReports(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]InspectorReportMessage, 0, len(rows))
	for _, r := range rows {
		out = append(out, InspectorReportMessage{
			ID:                 r.ID,
			ConsensusTimestamp: r.ConsensusTimestamp,
			FacilityAddress:    r.FacilityAddress,
			InspectorAddress:   r.InspectorAddress,
			ReportCID:          r.ReportCid,
			Signature:          r.Signature,
			CreatedAt:          r.CreatedAt.Time,
		})
	}

	s.populateInspectorReportIPFSStatus(ctx, out)
	return out, nil
}

func (s *Service) checkCIDExists(ctx context.Context, cid string) bool {
	if strings.TrimSpace(cid) == "" {
		return false
	}

	url := s.ipfsGatewayURL + "/ipfs/" + cid
	req, err := http.NewRequestWithContext(ctx, http.MethodHead, url, nil)
	if err != nil {
		return false
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 300
}

func (s *Service) populateIPFSStatus(ctx context.Context, docs []GatewayDocumentMessage) {
	var wg sync.WaitGroup
	for i := range docs {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			docs[idx].IPFSExists = s.checkCIDExists(ctx, docs[idx].DocumentCID)
		}(i)
	}
	wg.Wait()
}

func (s *Service) populateInspectorReportIPFSStatus(ctx context.Context, reports []InspectorReportMessage) {
	var wg sync.WaitGroup
	for i := range reports {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			reports[idx].IPFSExists = s.checkCIDExists(ctx, reports[idx].ReportCID)
		}(i)
	}
	wg.Wait()
}
