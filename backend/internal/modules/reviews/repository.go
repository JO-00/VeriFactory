package reviews

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"

	"veriFactory/backend/internal/database/sqlc"
)

var ErrReviewNotFound = errors.New("review not found")

type Repository struct {
	q *db.Queries
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{
		q: db.New(pool),
	}
}

func (r *Repository) UpsertReview(ctx context.Context, params db.UpsertFacilityReviewParams) (db.VerifactoryFacilityReview, error) {
	return r.q.UpsertFacilityReview(ctx, params)
}

func (r *Repository) DeleteReview(ctx context.Context, facilityAddr, userAddr string) error {
	affected, err := r.q.DeleteFacilityReview(ctx, db.DeleteFacilityReviewParams{
		Lower:   facilityAddr,
		Lower_2: userAddr,
	})
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrReviewNotFound
	}
	return nil
}

func (r *Repository) ListReviews(ctx context.Context, facilityAddr string, start, pageSize int32) ([]db.VerifactoryFacilityReview, int64, error) {
	rows, err := r.q.ListFacilityReviews(ctx, db.ListFacilityReviewsParams{
		Lower:  facilityAddr,
		Limit:  pageSize,
		Offset: start,
	})
	if err != nil {
		return nil, 0, err
	}

	total, err := r.q.CountFacilityReviews(ctx, facilityAddr)
	if err != nil {
		return nil, 0, err
	}

	return rows, total, nil
}

func (r *Repository) GetReputation(ctx context.Context, facilityAddr string) (db.GetFacilityReputationRow, error) {
	return r.q.GetFacilityReputation(ctx, facilityAddr)
}
