-- +goose Up

CREATE TABLE verifactory.users (
    wallet_address TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE verifactory.user_favorite_facilities (
    wallet_address TEXT NOT NULL REFERENCES verifactory.users(wallet_address) ON DELETE CASCADE,
    facility_address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (wallet_address, facility_address)
);

CREATE INDEX idx_user_favorite_facilities_wallet
    ON verifactory.user_favorite_facilities (wallet_address, created_at DESC);

-- +goose Down

DROP TABLE IF EXISTS verifactory.user_favorite_facilities;
DROP TABLE IF EXISTS verifactory.users;
