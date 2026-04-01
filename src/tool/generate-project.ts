import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SpringInitializrUrlBuilder } from "./url-builder.js";
import { fetchZip } from "../util/download.js";
import { logger } from "../util/logger.js";
import {
  PROJECT_TYPE_DESCRIPTION,
  LANGUAGE_DESCRIPTION,
  BOOT_VERSION_DESCRIPTION,
  GROUP_ID_DESCRIPTION,
  ARTIFACT_ID_DESCRIPTION,
  VERSION_DESCRIPTION,
  PROJECT_NAME_DESCRIPTION,
  PROJECT_DESCRIPTION_DESCRIPTION,
  PACKAGE_NAME_DESCRIPTION,
  PACKAGING_DESCRIPTION,
  JAVA_VERSION_DESCRIPTION,
  BASE_DIR_DESCRIPTION,
  DEPENDENCIES_DESCRIPTION,
} from "./constants.js";

export function registerTools(server: McpServer): void {
  server.tool(
    "generate-spring-boot-project",
    "Generates a Spring Boot project archive (ZIP). Returns the archive as base64-encoded content.",
    {
      projectType: z.string().optional().describe(PROJECT_TYPE_DESCRIPTION),
      language: z.string().optional().describe(LANGUAGE_DESCRIPTION),
      bootVersion: z.string().optional().describe(BOOT_VERSION_DESCRIPTION),
      groupId: z.string().optional().describe(GROUP_ID_DESCRIPTION),
      artifactId: z.string().optional().describe(ARTIFACT_ID_DESCRIPTION),
      version: z.string().optional().describe(VERSION_DESCRIPTION),
      name: z.string().optional().describe(PROJECT_NAME_DESCRIPTION),
      description: z.string().optional().describe(PROJECT_DESCRIPTION_DESCRIPTION),
      packageName: z.string().optional().describe(PACKAGE_NAME_DESCRIPTION),
      packaging: z.string().optional().describe(PACKAGING_DESCRIPTION),
      javaVersion: z.string().optional().describe(JAVA_VERSION_DESCRIPTION),
      baseDir: z.string().optional().describe(BASE_DIR_DESCRIPTION),
      dependencies: z.string().optional().describe(DEPENDENCIES_DESCRIPTION),
    },
    async (params) => {
      const artifactId = params.artifactId ?? "demo";
      logger.info(`Generating project: artifactId=${artifactId}, type=${params.projectType ?? "default"}, language=${params.language ?? "default"}`);

      const downloadUrl = SpringInitializrUrlBuilder.fromParameters(params).build();
      logger.debug(`Download URL: ${downloadUrl}`);

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
        throw new Error(`Failed to generate project: ${e.message}`);
      }
    },
  );
}