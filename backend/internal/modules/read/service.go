package read

import (
	"context"
	"time"

	"veriFactory/backend/internal/database/sqlc"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type GatewayDocumentMessage struct {
	ID                 int64     `json:"id"`
	ConsensusTimestamp string    `json:"consensusTimestamp"`
	FacilityAddress    string    `json:"facilityAddress"`
	GatewayID          string    `json:"gatewayId"`
	GatewayAddress     string    `json:"gatewayAddress"`
	DocumentCID        string    `json:"documentCID"`
	Signature          string    `json:"signature"`
	CreatedAt          time.Time `json:"createdAt"`
}

type InspectorReportMessage struct {
	ID                 int64     `json:"id"`
	ConsensusTimestamp string    `json:"consensusTimestamp"`
	FacilityAddress    string    `json:"facilityAddress"`
	InspectorAddress   string    `json:"inspectorAddress"`
	ReportCID          string    `json:"reportCID"`
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
	return out, nil
}
