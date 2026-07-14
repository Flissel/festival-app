import { NextRequest } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp/server";
import { logger } from "@/lib/logger";

function isAuthorized(request: NextRequest): boolean {
  const token = process.env.MCP_SERVER_TOKEN;
  if (!token) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${token}`;
}

async function handle(request: NextRequest): Promise<Response> {
  if (!isAuthorized(request)) {
    logger.warn("mcp.unauthorized");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function DELETE(request: NextRequest) {
  return handle(request);
}
