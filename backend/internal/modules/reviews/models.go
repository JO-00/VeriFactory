package reviews

import "time"

type UpsertReviewRequest struct {
	UserEVMAddress string `json:"user_evm_address" binding:"required"`
	Stars          int32  `json:"stars"`
	Review         string `json:"review"`
	Signature      string `json:"signature" binding:"required"`
	Timestamp      string `json:"timestamp" binding:"required"`
}

type DeleteReviewRequest struct {
	UserEVMAddress string `json:"user_evm_address" binding:"required"`
	Signature      string `json:"signature" binding:"required"`
	Timestamp      string `json:"timestamp" binding:"required"`
}

type ReviewItem struct {
	ID              int64     `json:"id"`
	FacilityAddress string    `json:"facility_address"`
	UserEVMAddress  string    `json:"user_evm_address"`
	Stars           int32     `json:"stars"`
	Review          string    `json:"review"`
	Signature       string    `json:"signature"`
	Timestamp       string    `json:"timestamp"`
	SignatureValid  bool      `json:"signature_valid"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type ListReviewsResponse struct {
	FacilityAddress string       `json:"facility_address"`
	Start           int32        `json:"start"`
	PageSize        int32        `json:"page_size"`
	Total           int64        `json:"total"`
	Reviews         []ReviewItem `json:"reviews"`
}

type StarDistribution struct {
	ZeroStars  int64 `json:"0"`
	OneStar    int64 `json:"1"`
	TwoStars   int64 `json:"2"`
	ThreeStars int64 `json:"3"`
	FourStars  int64 `json:"4"`
	FiveStars  int64 `json:"5"`
}

type FacilityReputationResponse struct {
	FacilityAddress string           `json:"facility_address"`
	AverageStars    float64          `json:"average_stars"`
	TotalReviews    int64            `json:"total_reviews"`
	Breakdown       StarDistribution `json:"breakdown"`
}
