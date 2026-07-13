import { logger } from "@/lib/logger";

export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL;
  const token = process.env.OPENCLAW_GATEWAY_TOKEN;

  if (!gatewayUrl || !token) {
    logger.warn("openclaw.not_configured");
    return;
  }

  try {
    const response = await fetch(`${gatewayUrl.replace(/\/$/, "")}/tools/invoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool: "message",
        action: "send",
        args: {
          channel: "whatsapp",
          target: phone.replace(/[^\d+]/g, ""),
          message,
        },
      }),
    });

    const data: unknown = await response.json().catch(() => null);
    const ok = data && typeof data === "object" && "ok" in data && data.ok === true;

    if (!response.ok || !ok) {
      logger.warn("openclaw.send_failed", { status: response.status, body: JSON.stringify(data) });
    } else {
      logger.info("openclaw.send_ok", { phone });
    }
  } catch (error) {
    logger.warn("openclaw.send_error", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
