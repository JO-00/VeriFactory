-- name: UpsertUser :one
INSERT INTO verifactory.users (
    wallet_address,
    created_at,
    updated_at
) VALUES (
    LOWER($1),
    NOW(),
    NOW()
)
ON CONFLICT (wallet_address) DO UPDATE SET
    updated_at = NOW()
RETURNING
    wallet_address,
    created_at,
    updated_at;

-- name: GetUser :one
SELECT
    wallet_address,
    created_at,
    updated_at
FROM verifactory.users
WHERE wallet_address = LOWER($1);

-- name: AddUserFavoriteFacility :exec
INSERT INTO verifactory.user_favorite_facilities (
    wallet_address,
    facility_address,
    created_at
) VALUES (
    LOWER($1),
    LOWER($2),
    NOW()
)
ON CONFLICT (wallet_address, facility_address) DO NOTHING;

-- name: RemoveUserFavoriteFacility :execrows
DELETE FROM verifactory.user_favorite_facilities
WHERE wallet_address = LOWER($1)
  AND facility_address = LOWER($2);

-- name: ClearUserFavoriteFacilities :exec
DELETE FROM verifactory.user_favorite_facilities
WHERE wallet_address = LOWER($1);

-- name: ListUserFavoriteFacilities :many
SELECT
    facility_address
FROM verifactory.user_favorite_facilities
WHERE wallet_address = LOWER($1)
ORDER BY created_at DESC;
