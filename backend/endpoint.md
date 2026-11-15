# POST /api/v1/facilities/:addr/reviews: adds a review of a facility to the database
## Body
{
  "user_evm_address": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  "stars": 5,
  "review": "Consistent telemetry uptime and transparent audit logs.",
  "signature": "0x...",
  "timestamp": "1794680000"
}

# PUT /api/v1/facilities/:addr/reviews: changes a review of the facility

# DELETE /api/v1/facilities/:addr/reviews: deletes reviews of the facility

# GET /api/v1/facilities/:addr/reviews?start=0&page_size=20: gives the list of reviews of the facility

# GET /api/v1/facilities/:addr/reputation: gives the average reputation of the facility

# POST /api/v1/users: Registers/upserts a user by wallet_address and optional favorite_facilities array

## Body
{
  "wallet_address": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  "favorite_facilities": [
    "0x21ebc2d97a649b3f0228a711dc65c9452fa25eb7",
    "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199"
  ]
}

# GET /api/v1/users/:wallet: Returns the user's wallet_address and favorite_facilities

# PUT /api/v1/users/:wallet/favorites: Replaces the user's favorite_facilities list

## Body
{
  "favorite_facilities": [
    "0x21ebc2d97a649b3f0228a711dc65c9452fa25eb7"
  ]
}

# POST /api/v1/users/:wallet/favorites: Adds a single facility_address to favorites

## Body

{
  "facility_address": "0x21ebc2d97a649b3f0228a711dc65c9452fa25eb7"
}

# DELETE /api/v1/users/:wallet/favorites/:facilityAddr: Removes a single facility from favorites
