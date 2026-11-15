package reviews

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"strings"

	"github.com/ethereum/go-ethereum/common"

	"veriFactory/backend/internal/database/sqlc"
)

var (
	ErrInvalidInput     = errors.New("invalid input")
	ErrInvalidSignature = errors.New("invalid signature")
)

type Service struct {
	repo   *Repository
	logger *slog.Logger
}

func NewService(repo *Repository, logger *slog.Logger) *Service {
	return &Service{
		repo:   repo,
		logger: logger,
	}
}

func (s *Service) UpsertReview(ctx context.Context, facilityAddr string, req UpsertReviewRequest) (ReviewItem, error) {
	facilityAddr = strings.ToLower(strings.TrimSpace(facilityAddr))
	userAddr := strings.ToLower(strings.TrimSpace(req.UserEVMAddress))

	if !common.IsHexAddress(facilityAddr) {
		return ReviewItem{}, fmt.Errorf("%w: invalid facility EVM address", ErrInvalidInput)
	}
	if !common.IsHexAddress(userAddr) {
		return ReviewItem{}, fmt.Errorf("%w: invalid user EVM address", ErrInvalidInput)
	}
	if req.Stars < 0 || req.Stars > 5 {
		return ReviewItem{}, fmt.Errorf("%w: stars must be between 0 and 5", ErrInvalidInput)
	}
	if strings.TrimSpace(req.Timestamp) == "" {
		return ReviewItem{}, fmt.Errorf("%w: timestamp is required", ErrInvalidInput)
	}

	msg := BuildCanonicalReviewMessage(facilityAddr, req.Stars, req.Review, req.Timestamp)
	if err := VerifyEVMSignature(userAddr, msg, req.Signature); err != nil {
		return ReviewItem{}, fmt.Errorf("%w: %v", ErrInvalidSignature, err)
	}

	row, err := s.repo.UpsertReview(ctx, db.UpsertFacilityReviewParams{
		Lower:           facilityAddr,
		Lower_2:         userAddr,
		Stars:           req.Stars,
		Review:          req.Review,
		Signature:       strings.TrimSpace(req.Signature),
		SignedTimestamp: strings.TrimSpace(req.Timestamp),
	})
	if err != nil {
		return ReviewItem{}, err
	}

	return mapReviewRow(row, true), nil
}

func (s *Service) DeleteReview(ctx context.Context, facilityAddr string, req DeleteReviewRequest) error {
	facilityAddr = strings.ToLower(strings.TrimSpace(facilityAddr))
	userAddr := strings.ToLower(strings.TrimSpace(req.UserEVMAddress))

	if !common.IsHexAddress(facilityAddr) || !common.IsHexAddress(userAddr) {
		return fmt.Errorf("%w: invalid EVM address", ErrInvalidInput)
	}
	if strings.TrimSpace(req.Timestamp) == "" {
		return fmt.Errorf("%w: timestamp is required", ErrInvalidInput)
	}

	msg := BuildCanonicalDeleteMessage(facilityAddr, req.Timestamp)
	if err := VerifyEVMSignature(userAddr, msg, req.Signature); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidSignature, err)
	}

	return s.repo.DeleteReview(ctx, facilityAddr, userAddr)
}

func (s *Service) ListVerifiedReviews(ctx context.Context, facilityAddr string, start, pageSize int32) (ListReviewsResponse, error) {
	facilityAddr = strings.ToLower(strings.TrimSpace(facilityAddr))
	if !common.IsHexAddress(facilityAddr) {
		return ListReviewsResponse{}, fmt.Errorf("%w: invalid facility EVM address", ErrInvalidInput)
	}

	rows, total, err := s.repo.ListReviews(ctx, facilityAddr, start, pageSize)
	if err != nil {
		return ListReviewsResponse{}, err
	}

	verified := make([]ReviewItem, 0, len(rows))
	for _, r := range rows {
		msg := BuildCanonicalReviewMessage(r.FacilityAddress, r.Stars, r.Review, r.SignedTimestamp)
		if err := VerifyEVMSignature(r.UserEvmAddress, msg, r.Signature); err != nil {
			s.logger.Warn("skipping review with invalid stored signature",
				"review_id", r.ID,
				"facility", r.FacilityAddress,
				"user", r.UserEvmAddress,
				"error", err,
			)
			continue
		}
		verified = append(verified, mapReviewRow(r, true))
	}

	return ListReviewsResponse{
		FacilityAddress: facilityAddr,
		Start:           start,
		PageSize:        pageSize,
		Total:           total,
		Reviews:         verified,
	}, nil
}

func (s *Service) GetFacilityReputation(ctx context.Context, facilityAddr string) (FacilityReputationResponse, error) {
	facilityAddr = strings.ToLower(strings.TrimSpace(facilityAddr))
	if !common.IsHexAddress(facilityAddr) {
		return FacilityReputationResponse{}, fmt.Errorf("%w: invalid facility EVM address", ErrInvalidInput)
	}

	row, err := s.repo.GetReputation(ctx, facilityAddr)
	if err != nil {
		return FacilityReputationResponse{}, err
	}

	// Round average to 2 decimal places for clean display
	avg := math.Round(row.AverageStars*100) / 100

	return FacilityReputationResponse{
		FacilityAddress: facilityAddr,
		AverageStars:    avg,
		TotalReviews:    row.TotalReviews,
		Breakdown: StarDistribution{
			ZeroStars:  row.ZeroStars,
			OneStar:    row.OneStar,
			TwoStars:   row.TwoStars,
			ThreeStars: row.ThreeStars,
			FourStars:  row.FourStars,
			FiveStars:  row.FiveStars,
		},
	}, nil
}

func mapReviewRow(r db.VerifactoryFacilityReview, valid bool) ReviewItem {
	return ReviewItem{
		ID:              r.ID,
		FacilityAddress: r.FacilityAddress,
		UserEVMAddress:  r.UserEvmAddress,
		Stars:           r.Stars,
		Review:          r.Review,
		Signature:       r.Signature,
		Timestamp:       r.SignedTimestamp,
		SignatureValid:  valid,
		CreatedAt:       r.CreatedAt.Time,
		UpdatedAt:       r.UpdatedAt.Time,
	}
}
