#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { registerTools } from "./tool/generate-project.js";
import { registerResources } from "./resource/spring-initializr-metadata.js";
import { registerPrompts } from "./prompt/generate-project-prompt.js";
import { logger } from "./util/logger.js";

const SERVER_NAME = "springinitializr";
const SERVER_VERSION = "1.0.0";

async function createServer(): Promise<McpServer> {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });
  await registerTools(server);
  registerResources(server);
  registerPrompts(server);
  return server;
}

async function startHttp() {
  logger.useStdout();

  const port = parseInt(process.env.SERVER_PORT || "8080", 10);
  const app = express();
  app.use(express.json());

  const sessions = new Map<string, StreamableHTTPServerTransport>();

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions.has(sessionId)) {
      transport = sessions.get(sessionId)!;
      logger.debug(`POST /mcp session=${sessionId}`);
      await transport.handleRequest(req, res, req.body);
    } else if (!sessionId && req.body?.method === "initialize") {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) {
          sessions.delete(sid);
          logger.debug(`Session closed: ${sid}`);
        }
      };

      const server = await createServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      const sid = transport.sessionId;
      if (!sid) {
        logger.error("Failed to obtain session ID");
        return;
      }
      sessions.set(sid, transport);
      logger.info(`New session: ${sid}`);
    } else {
      res.status(400).json({ error: "Bad request: missing session or not an initialize request" });
      return;
    }
  });

  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    logger.debug(`GET /mcp session=${sessionId}`);
    await sessions.get(sessionId)!.handleRequest(req, res);
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    logger.debug(`DELETE /mcp session=${sessionId}`);
    await sessions.get(sessionId)!.handleRequest(req, res);
  });

  await new Promise<void>((resolve) => {
    app.listen(port, () => {
      logger.info(`Server started on port ${port} (HTTP)`);
      resolve();
    });
  });

  // Keep process alive
  await new Promise(() => {});
}

async function startStdio() {
  logger.info(`Server starting (stdio)`);
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(`Server connected (stdio)`);
}

async function main() {
  const args = process.argv.slice(2);
  const transportMode = args.includes("--transport")
    ? args[args.indexOf("--transport") + 1]
    : "stdio";

  if (transportMode === "http") {
    await startHttp();
  } else {
    await startStdio();
  }
}

main().catch((err) => {
  logger.error(`Fatal: ${err.message}`);
  process.exit(1);
});