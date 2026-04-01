import { logger } from "../util/logger.js";

const METADATA_URL = "https://start.spring.io/metadata/client";

export interface MetadataOption {
  id: string;
  name: string;
  description?: string;
}

export interface DependencyItem {
  id: string;
  name: string;
  description?: string;
}

export interface DependencyCategory {
  name: string;
  values: DependencyItem[];
}

export interface MetadataField {
  type: string;
  default?: string;
  values?: MetadataOption[];
}

export interface Metadata {
  [key: string]: MetadataField | { values?: DependencyCategory[] } | unknown;
  bootVersion?: MetadataField;
  type?: MetadataField;
  language?: MetadataField;
  packaging?: MetadataField;
  javaVersion?: MetadataField;
  groupId?: MetadataField;
  artifactId?: MetadataField;
  version?: MetadataField;
  name?: MetadataField;
  description?: MetadataField;
  packageName?: MetadataField;
  dependencies?: { values?: DependencyCategory[] };
}

let cachedMetadata: Metadata | null = null;

export async function fetchMetadata(): Promise<Metadata> {
  if (cachedMetadata) return cachedMetadata;

  logger.debug("Fetching Spring Initializr metadata...");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(METADATA_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    cachedMetadata = (await response.json()) as Metadata;
    logger.info("Spring Initializr metadata fetched successfully");
    return cachedMetadata;
  } finally {
    clearTimeout(timeout);
  }
}