// ============== reputationApi.ts ==============

const BACKEND_BASE =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ??
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:8082';

// ── Types (match Go structs exactly) ──
export interface UpsertReviewRequest {
  user_evm_address: string;
  stars: number;
  review: string;
  signature: string;
  timestamp: string;
}

export interface DeleteReviewRequest {
  user_evm_address: string;
  signature: string;
  timestamp: string;
}

export interface ReviewItem {
  id: number;
  facility_address: string;
  user_evm_address: string;
  stars: number;
  review: string;
  signature: string;
  timestamp: string;
  signature_valid: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListReviewsResponse {
  facility_address: string;
  start: number;
  page_size: number;
  total: number;
  reviews: ReviewItem[];
}

export interface StarDistribution {
  '0': number;
  '1': number;
  '2': number;
  '3': number;
  '4': number;
  '5': number;
}

export interface FacilityReputationResponse {
  facility_address: string;
  average_stars: number;
  total_reviews: number;
  breakdown: StarDistribution;
}

export interface UserFavorites {
  wallet_address: string;
  favorite_facilities: string[];
}

// ── Canonical messages (must match verifier.go byte-for-byte) ──
export const buildReviewMessage = (
  facilityAddress: string,
  stars: number,
  review: string,
  timestamp: string,
): string =>
  `VeriFactory Review\n` +
  `Facility: ${facilityAddress.toLowerCase().trim()}\n` +
  `Stars: ${stars}\n` +
  `Review: ${review}\n` +
  `Timestamp: ${timestamp.trim()}`;

export const buildDeleteMessage = (
  facilityAddress: string,
  timestamp: string,
): string =>
  `VeriFactory Delete Review\n` +
  `Facility: ${facilityAddress.toLowerCase().trim()}\n` +
  `Timestamp: ${timestamp.trim()}`;

// ── Fetch wrapper ──
const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${BACKEND_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
  }
  const txt = await res.text();
  return (txt ? JSON.parse(txt) : (undefined as unknown)) as T;
};

// ── Endpoints ──
export const listReviews = (
  facilityAddress: string,
  start = 0,
  pageSize = 20,
): Promise<ListReviewsResponse> => {
  const params = new URLSearchParams({
    start: String(start),
    page_size: String(pageSize),
  });
  return request<ListReviewsResponse>(
    `/api/v1/facilities/${facilityAddress}/reviews?${params.toString()}`,
  );
};

export const upsertReview = (
  facilityAddress: string,
  body: UpsertReviewRequest,
): Promise<ReviewItem> =>
  request<ReviewItem>(`/api/v1/facilities/${facilityAddress}/reviews`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const deleteReview = (
  facilityAddress: string,
  body: DeleteReviewRequest,
): Promise<{ status: string }> =>
  request<{ status: string }>(
    `/api/v1/facilities/${facilityAddress}/reviews`,
    { method: 'DELETE', body: JSON.stringify(body) },
  );

export const getReputation = (
  facilityAddress: string,
): Promise<FacilityReputationResponse> =>
  request<FacilityReputationResponse>(
    `/api/v1/facilities/${facilityAddress}/reputation`,
  );

export const upsertUser = (
  walletAddress: string,
  favoriteFacilities?: string[],
): Promise<UserFavorites> =>
  request<UserFavorites>(`/api/v1/users`, {
    method: 'POST',
    body: JSON.stringify({
      wallet_address: walletAddress,
      ...(favoriteFacilities ? { favorite_facilities: favoriteFacilities } : {}),
    }),
  });

export const getUser = (wallet: string): Promise<UserFavorites> =>
  request<UserFavorites>(`/api/v1/users/${wallet}`);

export const replaceFavorites = (
  wallet: string,
  favoriteFacilities: string[],
): Promise<UserFavorites> =>
  request<UserFavorites>(`/api/v1/users/${wallet}/favorites`, {
    method: 'PUT',
    body: JSON.stringify({ favorite_facilities: favoriteFacilities }),
  });

export const addFavorite = (
  wallet: string,
  facilityAddress: string,
): Promise<UserFavorites> =>
  request<UserFavorites>(`/api/v1/users/${wallet}/favorites`, {
    method: 'POST',
    body: JSON.stringify({ facility_address: facilityAddress }),
  });

export const removeFavorite = (
  wallet: string,
  facilityAddress: string,
): Promise<void> =>
  request<void>(`/api/v1/users/${wallet}/favorites/${facilityAddress}`, {
    method: 'DELETE',
  });