import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../util/logger.js";

const METADATA_URL = "https://start.spring.io/metadata/client";

interface MetadataOption {
  id: string;
  name: string;
  description?: string;
}

interface DependencyItem {
  id: string;
  name: string;
  description?: string;
}

interface DependencyCategory {
  name: string;
  values: DependencyItem[];
}

interface Metadata {
  bootVersion?: { default?: string; values?: MetadataOption[] };
  type?: { default?: string; values?: MetadataOption[] };
  language?: { default?: string; values?: MetadataOption[] };
  packaging?: { default?: string; values?: MetadataOption[] };
  javaVersion?: { default?: string; values?: MetadataOption[] };
  dependencies?: { values?: DependencyCategory[] };
}

let cachedMetadata: Metadata | null = null;

async function fetchMetadata(): Promise<Metadata> {
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

function formatOptions(label: string, defaultVal: string | undefined, values: MetadataOption[] | undefined): string {
  if (!values) return `${label}: no data available\n`;
  const lines = values.map((v) => {
    const def = v.id === defaultVal ? " (default)" : "";
    const desc = v.description ? ` — ${v.description}` : "";
    return `  - ${v.id}${def}${desc}`;
  });
  return `${label}:\n${lines.join("\n")}\n`;
}

export function registerResources(server: McpServer): void {
  // Overview resource — all options except dependencies
  server.resource(
    "spring-initializr-options",
    "springinitializr://options",
    {
      description: "Available Spring Initializr project options: project types, languages, Java versions, packaging, and Spring Boot versions",
      mimeType: "text/plain",
    },
    async () => {
      const m = await fetchMetadata();
      const text = [
        "# Spring Initializr — Available Options\n",
        formatOptions("Project types", m.type?.default, m.type?.values),
        formatOptions("Languages", m.language?.default, m.language?.values),
        formatOptions("Java versions", m.javaVersion?.default, m.javaVersion?.values),
        formatOptions("Packaging", m.packaging?.default, m.packaging?.values),
        formatOptions("Spring Boot versions", m.bootVersion?.default, m.bootVersion?.values),
      ].join("\n");

      return { contents: [{ uri: "springinitializr://options", text, mimeType: "text/plain" }] };
    },
  );

  // Dependencies resource — all dependencies grouped by category
  server.resource(
    "spring-initializr-dependencies",
    "springinitializr://dependencies",
    {
      description: "All available Spring Initializr dependencies grouped by category",
      mimeType: "text/plain",
    },
    async () => {
      const m = await fetchMetadata();
      const sections = (m.dependencies?.values ?? []).map((cat) => {
        const deps = cat.values
          .map((d) => `  - ${d.id}: ${d.name}${d.description ? ` — ${d.description}` : ""}`)
          .join("\n");
        return `## ${cat.name}\n${deps}`;
      });

      const text = `# Spring Initializr — Available Dependencies\n\n${sections.join("\n\n")}\n`;
      return { contents: [{ uri: "springinitializr://dependencies", text, mimeType: "text/plain" }] };
    },
  );

  // Dynamic resource: dependencies by category
  server.resource(
    "spring-initializr-dependencies-by-category",
    new ResourceTemplate("springinitializr://dependencies/{category}", { list: undefined }),
    {
      description: "Dependencies for a specific category (e.g. Web, SQL, Security, AI)",
      mimeType: "text/plain",
    },
    async (uri, params) => {
      const m = await fetchMetadata();
      const categoryName = (params.category as string).toLowerCase();
      const cat = (m.dependencies?.values ?? []).find(
        (c) => c.name.toLowerCase() === categoryName,
      );

      if (!cat) {
        const available = (m.dependencies?.values ?? []).map((c) => c.name).join(", ");
        return {
          contents: [{
            uri: uri.href,
            text: `Category "${params.category}" not found.\n\nAvailable categories: ${available}`,
            mimeType: "text/plain",
          }],
        };
      }

      const deps = cat.values
        .map((d) => `- ${d.id}: ${d.name}${d.description ? ` — ${d.description}` : ""}`)
        .join("\n");
      const text = `# ${cat.name} Dependencies\n\n${deps}\n`;

      return { contents: [{ uri: uri.href, text, mimeType: "text/plain" }] };
    },
  );

  // --- JSON resources ---

  server.resource(
    "spring-initializr-options-json",
    "springinitializr://options/json",
    {
      description: "Spring Initializr project options in JSON: project types, languages, Java versions, packaging, Spring Boot versions",
      mimeType: "application/json",
    },
    async () => {
      const m = await fetchMetadata();
      const json = {
        projectTypes: formatFieldJson(m.type),
        languages: formatFieldJson(m.language),
        javaVersions: formatFieldJson(m.javaVersion),
        packaging: formatFieldJson(m.packaging),
        bootVersions: formatFieldJson(m.bootVersion),
      };
      return {
        contents: [{
          uri: "springinitializr://options/json",
          text: JSON.stringify(json, null, 2),
          mimeType: "application/json",
        }],
      };
    },
  );

  server.resource(
    "spring-initializr-dependencies-json",
    "springinitializr://dependencies/json",
    {
      description: "All Spring Initializr dependencies grouped by category in JSON",
      mimeType: "application/json",
    },
    async () => {
      const m = await fetchMetadata();
      const json = {
        categories: (m.dependencies?.values ?? []).map((cat) => ({
          name: cat.name,
          dependencies: cat.values.map(formatDepJson),
        })),
      };
      return {
        contents: [{
          uri: "springinitializr://dependencies/json",
          text: JSON.stringify(json, null, 2),
          mimeType: "application/json",
        }],
      };
    },
  );

  server.resource(
    "spring-initializr-dependencies-by-category-json",
    new ResourceTemplate("springinitializr://dependencies/{category}/json", { list: undefined }),
    {
      description: "Dependencies for a specific category in JSON (e.g. Web, SQL, Security, AI)",
      mimeType: "application/json",
    },
    async (uri, params) => {
      const m = await fetchMetadata();
      const categoryName = (params.category as string).toLowerCase();
      const cat = (m.dependencies?.values ?? []).find(
        (c) => c.name.toLowerCase() === categoryName,
      );

      if (!cat) {
        const available = (m.dependencies?.values ?? []).map((c) => c.name);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({ error: "Category not found", available }, null, 2),
            mimeType: "application/json",
          }],
        };
      }

      const json = {
        category: cat.name,
        dependencies: cat.values.map(formatDepJson),
      };
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(json, null, 2),
          mimeType: "application/json",
        }],
      };
    },
  );
}

function formatFieldJson(field?: { default?: string; values?: MetadataOption[] }) {
  return {
    default: field?.default ?? null,
    values: (field?.values ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      ...(v.description ? { description: v.description } : {}),
    })),
  };
}

function formatDepJson(d: DependencyItem) {
  return {
    id: d.id,
    name: d.name,
    ...(d.description ? { description: d.description } : {}),
  };
}