package users

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"veriFactory/backend/internal/database/sqlc"
)

var (
	ErrUserNotFound     = errors.New("user not found")
	ErrFavoriteNotFound = errors.New("favorite facility not found")
)

type Repository struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{
		pool: pool,
		q:    db.New(pool),
	}
}

func (r *Repository) RegisterUserWithFavorites(ctx context.Context, wallet string, favorites []string) (db.VerifactoryUser, []string, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return db.VerifactoryUser{}, nil, err
	}
	defer tx.Rollback(ctx)

	qtx := r.q.WithTx(tx)

	user, err := qtx.UpsertUser(ctx, wallet)
	if err != nil {
		return db.VerifactoryUser{}, nil, err
	}

	for _, fav := range favorites {
		if err := qtx.AddUserFavoriteFacility(ctx, db.AddUserFavoriteFacilityParams{
			Lower:   wallet,
			Lower_2: fav,
		}); err != nil {
			return db.VerifactoryUser{}, nil, err
		}
	}

	list, err := qtx.ListUserFavoriteFacilities(ctx, wallet)
	if err != nil {
		return db.VerifactoryUser{}, nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return db.VerifactoryUser{}, nil, err
	}

	if list == nil {
		list = []string{}
	}
	return user, list, nil
}

func (r *Repository) GetUserProfile(ctx context.Context, wallet string) (db.VerifactoryUser, []string, error) {
	user, err := r.q.GetUser(ctx, wallet)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return db.VerifactoryUser{}, nil, ErrUserNotFound
		}
		return db.VerifactoryUser{}, nil, err
	}

	list, err := r.q.ListUserFavoriteFacilities(ctx, wallet)
	if err != nil {
		return db.VerifactoryUser{}, nil, err
	}
	if list == nil {
		list = []string{}
	}
	return user, list, nil
}

func (r *Repository) ReplaceFavorites(ctx context.Context, wallet string, favorites []string) ([]string, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	qtx := r.q.WithTx(tx)

	if _, err := qtx.UpsertUser(ctx, wallet); err != nil {
		return nil, err
	}
	if err := qtx.ClearUserFavoriteFacilities(ctx, wallet); err != nil {
		return nil, err
	}
	for _, fav := range favorites {
		if err := qtx.AddUserFavoriteFacility(ctx, db.AddUserFavoriteFacilityParams{
			Lower:   wallet,
			Lower_2: fav,
		}); err != nil {
			return nil, err
		}
	}

	list, err := qtx.ListUserFavoriteFacilities(ctx, wallet)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	if list == nil {
		list = []string{}
	}
	return list, nil
}

func (r *Repository) AddFavorite(ctx context.Context, wallet, facility string) ([]string, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	qtx := r.q.WithTx(tx)

	if _, err := qtx.UpsertUser(ctx, wallet); err != nil {
		return nil, err
	}
	if err := qtx.AddUserFavoriteFacility(ctx, db.AddUserFavoriteFacilityParams{
		Lower:   wallet,
		Lower_2: facility,
	}); err != nil {
		return nil, err
	}

	list, err := qtx.ListUserFavoriteFacilities(ctx, wallet)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	if list == nil {
		list = []string{}
	}
	return list, nil
}

func (r *Repository) RemoveFavorite(ctx context.Context, wallet, facility string) ([]string, error) {
	affected, err := r.q.RemoveUserFavoriteFacility(ctx, db.RemoveUserFavoriteFacilityParams{
		Lower:   wallet,
		Lower_2: facility,
	})
	if err != nil {
		return nil, err
	}
	if affected == 0 {
		return nil, ErrFavoriteNotFound
	}

	list, err := r.q.ListUserFavoriteFacilities(ctx, wallet)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []string{}
	}
	return list, nil
}
