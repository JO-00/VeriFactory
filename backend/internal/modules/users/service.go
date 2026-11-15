package users

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/ethereum/go-ethereum/common"
)

var ErrInvalidInput = errors.New("invalid input")

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

func (s *Service) RegisterUser(ctx context.Context, req RegisterUserRequest) (UserProfileResponse, error) {
	wallet, err := normalizeEVMAddress(req.WalletAddress, "wallet_address")
	if err != nil {
		return UserProfileResponse{}, err
	}

	favs, err := normalizeAddressList(req.FavoriteFacilities)
	if err != nil {
		return UserProfileResponse{}, err
	}

	user, storedFavs, err := s.repo.RegisterUserWithFavorites(ctx, wallet, favs)
	if err != nil {
		return UserProfileResponse{}, err
	}

	return UserProfileResponse{
		WalletAddress:      user.WalletAddress,
		FavoriteFacilities: storedFavs,
		CreatedAt:          user.CreatedAt.Time,
		UpdatedAt:          user.UpdatedAt.Time,
	}, nil
}

func (s *Service) GetUser(ctx context.Context, walletParam string) (UserProfileResponse, error) {
	wallet, err := normalizeEVMAddress(walletParam, "wallet_address")
	if err != nil {
		return UserProfileResponse{}, err
	}

	user, favs, err := s.repo.GetUserProfile(ctx, wallet)
	if err != nil {
		return UserProfileResponse{}, err
	}

	return UserProfileResponse{
		WalletAddress:      user.WalletAddress,
		FavoriteFacilities: favs,
		CreatedAt:          user.CreatedAt.Time,
		UpdatedAt:          user.UpdatedAt.Time,
	}, nil
}

func (s *Service) SetFavorites(ctx context.Context, walletParam string, req SetFavoritesRequest) ([]string, error) {
	wallet, err := normalizeEVMAddress(walletParam, "wallet_address")
	if err != nil {
		return nil, err
	}

	favs, err := normalizeAddressList(req.FavoriteFacilities)
	if err != nil {
		return nil, err
	}

	return s.repo.ReplaceFavorites(ctx, wallet, favs)
}

func (s *Service) AddFavorite(ctx context.Context, walletParam, facilityParam string) ([]string, error) {
	wallet, err := normalizeEVMAddress(walletParam, "wallet_address")
	if err != nil {
		return nil, err
	}

	facility, err := normalizeEVMAddress(facilityParam, "facility_address")
	if err != nil {
		return nil, err
	}

	return s.repo.AddFavorite(ctx, wallet, facility)
}

func (s *Service) RemoveFavorite(ctx context.Context, walletParam, facilityParam string) ([]string, error) {
	wallet, err := normalizeEVMAddress(walletParam, "wallet_address")
	if err != nil {
		return nil, err
	}

	facility, err := normalizeEVMAddress(facilityParam, "facility_address")
	if err != nil {
		return nil, err
	}

	return s.repo.RemoveFavorite(ctx, wallet, facility)
}

func normalizeEVMAddress(raw, field string) (string, error) {
	addr := strings.ToLower(strings.TrimSpace(raw))
	if !common.IsHexAddress(addr) {
		return "", fmt.Errorf("%w: invalid %s", ErrInvalidInput, field)
	}
	return addr, nil
}

func normalizeAddressList(raw []string) ([]string, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	seen := make(map[string]struct{}, len(raw))
	out := make([]string, 0, len(raw))
	for _, item := range raw {
		addr, err := normalizeEVMAddress(item, "facility_address")
		if err != nil {
			return nil, err
		}
		if _, exists := seen[addr]; exists {
			continue
		}
		seen[addr] = struct{}{}
		out = append(out, addr)
	}
	return out, nil
}
