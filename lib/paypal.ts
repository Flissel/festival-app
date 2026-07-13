import { logger } from "@/lib/logger";

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) {
    throw new Error("PAYPAL_CLIENT_ID / PAYPAL_SECRET fehlen in der Umgebung");
  }

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error("paypal.oauth_failed", { status: response.status, body: text });
    throw new Error("PayPal-Authentifizierung fehlgeschlagen");
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.accessToken;
}

async function paypalFetch(path: string, init: RequestInit): Promise<Response> {
  const accessToken = await getAccessToken();
  return fetch(`${PAYPAL_API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

export async function createPaypalOrder(params: {
  paymentId: string;
  amount: number;
  currency: string;
}): Promise<{ id: string }> {
  const response = await paypalFetch("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: params.paymentId,
          amount: {
            currency_code: params.currency,
            value: params.amount.toFixed(2),
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error("paypal.create_order_failed", { status: response.status, body: text });
    throw new Error("PayPal-Order konnte nicht erstellt werden");
  }

  return (await response.json()) as { id: string };
}

export async function capturePaypalOrder(orderId: string): Promise<{
  status: string;
  purchaseUnits: Array<{ customId?: string; captureId?: string; amount?: string }>;
}> {
  const response = await paypalFetch(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
  });

  const data = (await response.json()) as {
    status: string;
    purchase_units?: Array<{
      custom_id?: string;
      payments?: { captures?: Array<{ id: string; amount?: { value: string } }> };
    }>;
  };

  if (!response.ok) {
    logger.error("paypal.capture_failed", { status: response.status, body: JSON.stringify(data) });
    throw new Error("PayPal-Zahlung konnte nicht erfasst werden");
  }

  return {
    status: data.status,
    purchaseUnits: (data.purchase_units ?? []).map((unit) => ({
      customId: unit.custom_id,
      captureId: unit.payments?.captures?.[0]?.id,
      amount: unit.payments?.captures?.[0]?.amount?.value,
    })),
  };
}

export async function verifyPaypalWebhookSignature(params: {
  webhookId: string;
  headers: Record<string, string>;
  body: unknown;
}): Promise<boolean> {
  const response = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      transmission_id: params.headers["paypal-transmission-id"],
      transmission_time: params.headers["paypal-transmission-time"],
      cert_url: params.headers["paypal-cert-url"],
      auth_algo: params.headers["paypal-auth-algo"],
      transmission_sig: params.headers["paypal-transmission-sig"],
      webhook_id: params.webhookId,
      webhook_event: params.body,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error("paypal.verify_webhook_failed", { status: response.status, body: text });
    return false;
  }

  const data = (await response.json()) as { verification_status: string };
  return data.verification_status === "SUCCESS";
}
