import { logger } from "@/lib/logger";

// OpenClaw ist das Gateway, über das die App Nachrichten verschickt. Der Kanal
// ist bewusst nicht fest verdrahtet: Welchen Namen OpenClaw für Telegram
// erwartet, entscheidet die Installation, nicht dieser Code.
export const DEFAULT_CHANNEL = process.env.OPENCLAW_CHANNEL ?? "telegram";

export type SendResult = { ok: true } | { ok: false; error: string };

export function groupChatId(): string | null {
  const raw = process.env.TELEGRAM_GROUP_CHAT_ID?.trim();
  return raw ? raw : null;
}

export function isGatewayConfigured(): boolean {
  return Boolean(process.env.OPENCLAW_GATEWAY_URL && process.env.OPENCLAW_GATEWAY_TOKEN);
}

// Gibt das Ergebnis zurück, statt Fehler zu schlucken. Die frühere Fassung war
// `Promise<void>` und protokollierte Fehler nur — der Broadcast meldete
// deshalb Erfolg, auch wenn keine einzige Nachricht rausging.
export async function sendChatMessage(params: {
  target: string;
  message: string;
  channel?: string;
}): Promise<SendResult> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL;
  const token = process.env.OPENCLAW_GATEWAY_TOKEN;

  if (!gatewayUrl || !token) {
    logger.warn("openclaw.not_configured");
    // Steht so in der Fehlerliste des Broadcast-Formulars — deshalb ohne den
    // Namen des Gateways, der für die Orga nichts bedeutet.
    return { ok: false, error: "Nachrichtenversand ist nicht eingerichtet" };
  }

  const channel = params.channel ?? DEFAULT_CHANNEL;

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
        args: { channel, target: params.target, message: params.message },
      }),
    });

    const data: unknown = await response.json().catch(() => null);
    const ok = data && typeof data === "object" && "ok" in data && data.ok === true;

    if (!response.ok || !ok) {
      const detail = `HTTP ${response.status}${data ? ` — ${JSON.stringify(data).slice(0, 200)}` : ""}`;
      logger.warn("openclaw.send_failed", { channel, status: response.status, body: detail });
      return { ok: false, error: detail };
    }

    logger.info("openclaw.send_ok", { channel });
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.warn("openclaw.send_error", { channel, error: detail });
    return { ok: false, error: detail };
  }
}

// Für die Zustellung an eine einzelne Person: Nummer auf Ziffern und Pluszeichen
// reduzieren, alles andere verwirrt das Gateway.
export async function sendToPhone(phone: string, message: string): Promise<SendResult> {
  return sendChatMessage({ target: phone.replace(/[^\d+]/g, ""), message });
}

// Eine Nachricht in die Orga-Gruppe statt an jede Person einzeln.
export async function sendToGroup(message: string): Promise<SendResult> {
  const chatId = groupChatId();
  if (!chatId) {
    return { ok: false, error: "TELEGRAM_GROUP_CHAT_ID ist nicht gesetzt" };
  }
  return sendChatMessage({ target: chatId, message });
}
