-- +goose Up

CREATE TABLE verifactory.facility_reviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    facility_address TEXT NOT NULL,
    user_evm_address TEXT NOT NULL,
    stars INT NOT NULL CHECK (stars >= 0 AND stars <= 5),
    review TEXT NOT NULL DEFAULT '',
    signature TEXT NOT NULL,
    signed_timestamp TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_facility_user_review
        UNIQUE (facility_address, user_evm_address)
);

CREATE INDEX idx_facility_reviews_facility_created
    ON verifactory.facility_reviews (facility_address, created_at DESC);

-- +goose Down

DROP TABLE IF EXISTS verifactory.facility_reviews;
