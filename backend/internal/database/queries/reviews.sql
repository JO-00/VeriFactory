-- name: UpsertFacilityReview :one
INSERT INTO verifactory.facility_reviews (
    facility_address,
    user_evm_address,
    stars,
    review,
    signature,
    signed_timestamp,
    created_at,
    updated_at
) VALUES (
    LOWER($1),
    LOWER($2),
    $3,
    $4,
    $5,
    $6,
    NOW(),
    NOW()
)
ON CONFLICT (facility_address, user_evm_address) DO UPDATE SET
    stars = EXCLUDED.stars,
    review = EXCLUDED.review,
    signature = EXCLUDED.signature,
    signed_timestamp = EXCLUDED.signed_timestamp,
    updated_at = NOW()
RETURNING
    id,
    facility_address,
    user_evm_address,
    stars,
    review,
    signature,
    signed_timestamp,
    created_at,
    updated_at;

-- name: DeleteFacilityReview :execrows
DELETE FROM verifactory.facility_reviews
WHERE LOWER(facility_address) = LOWER($1)
  AND LOWER(user_evm_address) = LOWER($2);

-- name: ListFacilityReviews :many
SELECT
    id,
    facility_address,
    user_evm_address,
    stars,
    review,
    signature,
    signed_timestamp,
    created_at,
    updated_at
FROM verifactory.facility_reviews
WHERE LOWER(facility_address) = LOWER($1)
ORDER BY updated_at DESC, id DESC
LIMIT $2 OFFSET $3;

-- name: CountFacilityReviews :one
SELECT COUNT(*)::bigint
FROM verifactory.facility_reviews
WHERE LOWER(facility_address) = LOWER($1);

-- name: GetFacilityReputation :one
SELECT
    COUNT(*)::bigint AS total_reviews,
    COALESCE(AVG(stars), 0)::float8 AS average_stars,
    COUNT(*) FILTER (WHERE stars = 0)::bigint AS zero_stars,
    COUNT(*) FILTER (WHERE stars = 1)::bigint AS one_star,
    COUNT(*) FILTER (WHERE stars = 2)::bigint AS two_stars,
    COUNT(*) FILTER (WHERE stars = 3)::bigint AS three_stars,
    COUNT(*) FILTER (WHERE stars = 4)::bigint AS four_stars,
    COUNT(*) FILTER (WHERE stars = 5)::bigint AS five_stars
FROM verifactory.facility_reviews
WHERE LOWER(facility_address) = LOWER($1);
