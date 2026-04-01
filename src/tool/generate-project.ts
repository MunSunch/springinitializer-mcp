import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildDownloadUrl } from "./url-builder.js";
import { fetchZip } from "../util/download.js";
import { logger } from "../util/logger.js";
import { fetchMetadata, type Metadata, type MetadataField } from "../resource/metadata.js";

/** Metadata key → tool parameter name (where they differ). */
const PARAM_KEY_MAP: Record<string, string> = { type: "projectType" };
const PARAM_KEY_REVERSE: Record<string, string> = { projectType: "type" };

/** Keys in metadata to skip when building the tool schema. */
const IGNORED_KEYS = new Set(["_links", "dependencies"]);

/** Extra parameters not present in metadata. */
const EXTRA_PARAMS: Record<string, string> = {
  baseDir: "The base directory name inside the generated archive. Defaults to the artifact id.",
  dependencies: "Comma-separated list of dependency IDs to include. See the 'springinitializr://dependencies' resource for available values.",
};

function fieldDescription(key: string, field: MetadataField): string {
  const label = key.replace(/([A-Z])/g, " $1").toLowerCase().trim();
  const def = field.default ? `Defaults to '${field.default}'. ` : "";
  if (field.values && field.values.length > 0) {
    const supported = field.values.map((v) => `'${v.id}'`).join(", ");
    return `The ${label}. ${def}Supported values: ${supported}.`;
  }
  return `The ${label}. ${def}`;
}

function isMetadataField(value: unknown): value is MetadataField {
  return value != null && typeof value === "object" && "type" in value && typeof (value as MetadataField).type === "string";
}

function buildSchema(metadata: Metadata): Record<string, z.ZodOptional<z.ZodString>> {
  const schema: Record<string, z.ZodOptional<z.ZodString>> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (IGNORED_KEYS.has(key)) continue;
    if (!isMetadataField(value)) continue;
    const paramName = PARAM_KEY_MAP[key] ?? key;
    schema[paramName] = z.string().optional().describe(fieldDescription(key, value));
  }

  for (const [paramName, desc] of Object.entries(EXTRA_PARAMS)) {
    schema[paramName] = z.string().optional().describe(desc);
  }

  return schema;
}

function validate(params: Record<string, string | undefined>, metadata: Metadata): string[] {
  const errors: string[] = [];

  for (const [key, value] of Object.entries(metadata)) {
    if (IGNORED_KEYS.has(key)) continue;
    if (!isMetadataField(value)) continue;
    if (!value.values || value.values.length === 0) continue;

    const paramName = PARAM_KEY_MAP[key] ?? key;
    const paramValue = params[paramName];
    if (paramValue == null) continue;

    const ids = value.values.map((v) => v.id);
    if (!ids.includes(paramValue)) {
      errors.push(`Invalid ${paramName}: '${paramValue}'. Supported values: ${ids.join(", ")}`);
    }
  }

  if (params.dependencies) {
    const allDeps = (metadata.dependencies?.values ?? []).flatMap((cat) => cat.values.map((d) => d.id));
    for (const dep of params.dependencies.split(",").map((d) => d.trim()).filter(Boolean)) {
      if (!allDeps.includes(dep)) {
        errors.push(`Invalid dependency: '${dep}'`);
      }
    }
  }

  return errors;
}

export async function registerTools(server: McpServer): Promise<void> {
  const metadata = await fetchMetadata();
  const schema = buildSchema(metadata);
  logger.info(`Tool schema built from live metadata (${Object.keys(schema).length} params)`);

  server.tool(
    "generate-spring-boot-project",
    "Generates a Spring Boot project archive (ZIP). Returns the archive as base64-encoded content.",
    schema,
    async (params) => {
      const artifactId = params.artifactId ?? "demo";
      logger.info(`Generating project: artifactId=${artifactId}, type=${params.projectType ?? "default"}, language=${params.language ?? "default"}`);

      const metadata = await fetchMetadata();
      const errors = validate(params, metadata);

      if (errors.length > 0) {
        logger.warn(`Validation failed: ${errors.join("; ")}`);
        return {
          isError: true,
          content: [{ type: "text", text: errors.join("\n") }],
        };
      }

      // Map tool param names back to Spring Initializr query param names
      const queryParams: Record<string, string> = {};
      for (const [paramName, value] of Object.entries(params)) {
        if (value == null || value.trim() === "") continue;
        const queryKey = PARAM_KEY_REVERSE[paramName] ?? paramName;
        queryParams[queryKey] = value.trim();
      }

      const downloadUrl = buildDownloadUrl(queryParams);
      logger.info(`Download URL: ${downloadUrl}`);

      try {
        const zipBuffer = await fetchZip(downloadUrl);
        logger.info(`Project generated: ${artifactId}.zip (${zipBuffer.length} bytes)`);

        return {
          content: [
            {
              type: "resource",
              resource: {
                uri: `springinitializr://generated/${artifactId}.zip`,
                blob: zipBuffer.toString("base64"),
                mimeType: "application/zip",
              },
            },
            {
              type: "text",
              text: `Generated Spring Boot project "${artifactId}.zip" (${zipBuffer.length} bytes). The archive is attached as a resource.`,
            },
          ],
        };
      } catch (e: any) {
        logger.error(`Failed to generate project: ${e.message}`);
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to generate project: ${e.message}` }],
        };
      }
    },
  );
}