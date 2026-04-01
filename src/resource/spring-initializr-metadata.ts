import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchMetadata, type MetadataField, type MetadataOption, type DependencyItem } from "./metadata.js";

const IGNORED_KEYS = new Set(["_links", "dependencies"]);

function isMetadataField(value: unknown): value is MetadataField {
  return value != null && typeof value === "object" && "type" in value && typeof (value as MetadataField).type === "string";
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

function fieldLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export function registerResources(server: McpServer): void {
  // Overview resource — all options except dependencies (dynamic)
  server.resource(
    "spring-initializr-options",
    "springinitializr://options",
    {
      description: "Available Spring Initializr project options",
      mimeType: "text/plain",
    },
    async () => {
      const m = await fetchMetadata();
      const sections: string[] = ["# Spring Initializr — Available Options\n"];

      for (const [key, value] of Object.entries(m)) {
        if (IGNORED_KEYS.has(key)) continue;
        if (!isMetadataField(value)) continue;
        if (!value.values || value.values.length === 0) continue;
        sections.push(formatOptions(fieldLabel(key), value.default, value.values));
      }

      return { contents: [{ uri: "springinitializr://options", text: sections.join("\n"), mimeType: "text/plain" }] };
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
      description: "Spring Initializr project options in JSON",
      mimeType: "application/json",
    },
    async () => {
      const m = await fetchMetadata();
      const json: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(m)) {
        if (IGNORED_KEYS.has(key)) continue;
        if (!isMetadataField(value)) continue;
        if (!value.values || value.values.length === 0) continue;
        json[key] = formatFieldJson(value);
      }

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

function formatFieldJson(field: MetadataField) {
  return {
    default: field.default ?? null,
    values: (field.values ?? []).map((v) => ({
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