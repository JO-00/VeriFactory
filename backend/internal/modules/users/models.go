package users

import "time"

type RegisterUserRequest struct {
	WalletAddress      string   `json:"wallet_address" binding:"required"`
	FavoriteFacilities []string `json:"favorite_facilities"`
}

type SetFavoritesRequest struct {
	FavoriteFacilities []string `json:"favorite_facilities" binding:"required"`
}

type AddFavoriteRequest struct {
	FacilityAddress string `json:"facility_address" binding:"required"`
}

type UserProfileResponse struct {
	WalletAddress      string    `json:"wallet_address"`
	FavoriteFacilities []string  `json:"favorite_facilities"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}
