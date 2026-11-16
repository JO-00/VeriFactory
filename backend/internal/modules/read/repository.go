package read

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"veriFactory/backend/internal/database/sqlc"
)

type Repository struct {
	q *db.Queries
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{q: db.New(pool)}
}

func (r *Repository) ListGatewayDocuments(ctx context.Context, facilityAddr, gatewayID string) ([]db.VerifactoryGatewayDocument, error) {
	return r.q.ListGatewayDocumentsByFacilityAndGateway(ctx, db.ListGatewayDocumentsByFacilityAndGatewayParams{
		Lower:     facilityAddr,
		GatewayID: gatewayID,
	})
}

func (r *Repository) ListInspectorReportsByInspector(ctx context.Context, inspectorAddr string) ([]db.VerifactoryInspectorReport, error) {
	return r.q.ListInspectorReportsByInspector(ctx, inspectorAddr)
}

func (r *Repository) ListInspectorReportsByFacility(ctx context.Context, facilityAddr string) ([]db.VerifactoryInspectorReport, error) {
	return r.q.ListInspectorReportsByFacility(ctx, facilityAddr)
}

func (r *Repository) ListInspectorReportsByFacilityAndInspector(ctx context.Context, facilityAddr, inspectorAddr string) ([]db.VerifactoryInspectorReport, error) {
	return r.q.ListInspectorReportsByFacilityAndInspector(ctx, db.ListInspectorReportsByFacilityAndInspectorParams{
		Lower:   facilityAddr,
		Lower_2: inspectorAddr,
	})
}

func (r *Repository) ListAllGatewayDocuments(ctx context.Context) ([]db.VerifactoryGatewayDocument, error) {
	return r.q.ListAllGatewayDocuments(ctx)
}

func (r *Repository) ListAllInspectorReports(ctx context.Context) ([]db.VerifactoryInspectorReport, error) {
	return r.q.ListAllInspectorReports(ctx)
}
