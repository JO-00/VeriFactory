-- +goose Up
CREATE SCHEMA IF NOT EXISTS verifactory;

-- +goose Down
DROP SCHEMA IF EXISTS verifactory CASCADE;
