import { logger } from "./logger.js";

export async function fetchZip(url: string): Promise<Buffer> {
  logger.debug(`Fetching ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error("Empty response body");
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  logger.debug(`Fetched ${buffer.length} bytes`);
  return buffer;
}