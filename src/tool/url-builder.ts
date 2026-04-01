const BASE_URL = "https://start.spring.io/starter.zip";

/**
 * Builds a Spring Initializr download URL from arbitrary query parameters.
 * Keys and values are passed through as-is (already mapped to API names).
 */
export function buildDownloadUrl(params: Record<string, string>): string {
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return query ? `${BASE_URL}?${query}` : BASE_URL;
}