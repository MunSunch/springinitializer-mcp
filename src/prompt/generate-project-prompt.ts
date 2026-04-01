import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer): void {
  server.prompt(
    "generate-spring-boot-project",
    "Helps generate a Spring Boot project by asking for requirements and calling the generate tool",
    {
      requirements: z.string().optional().describe("Brief description of what the project should do"),
    },
    (params) => {
      const userReq = params.requirements
        ? `\n\nUser requirements: ${params.requirements}`
        : "";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `I need to generate a new Spring Boot project.${userReq}

Please help me by:
1. First, read the available options from the "springinitializr://options" resource to check current Spring Boot versions, Java versions, and project types.
2. Read the "springinitializr://dependencies" resource to find the most suitable dependencies for my needs.
3. Based on my requirements, select the appropriate parameters:
   - Project type (Maven or Gradle)
   - Language (Java, Kotlin, or Groovy)
   - Spring Boot version (prefer latest stable)
   - Java version
   - Dependencies
   - Group ID and artifact ID
4. Call the "generate-spring-boot-project" tool to generate the project archive.
5. Show me a summary of what was generated and the returned archive.

If my requirements are unclear, ask me clarifying questions before generating.`,
            },
          },
        ],
      };
    },
  );
}