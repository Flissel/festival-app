"use client";

import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import type { OnApproveData } from "@paypal/paypal-js";

type Props = {
  clientId: string;
  guestId: string;
  amount: number;
};

export function PaypalDonation({ clientId, guestId, amount }: Props) {
  const [status, setStatus] = useState<"idle" | "paid" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!clientId) {
    return (
      <p className="mt-4 rounded-lg border border-dashed border-amber-400/40 p-4 text-sm text-amber-300">
        PayPal ist noch nicht konfiguriert (PAYPAL_CLIENT_ID fehlt).
      </p>
    );
  }

  if (status === "paid") {
    return (
      <p className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-400/10 p-4 text-sm text-emerald-300">
        Zahlung erhalten — vielen Dank!
      </p>
    );
  }

  return (
    <div className="mt-4">
      <PayPalScriptProvider options={{ clientId, currency: "EUR", intent: "capture" }}>
        <PayPalButtons
          style={{ layout: "vertical" }}
          createOrder={async () => {
            const response = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ guestId, amount }),
            });
            if (!response.ok) {
              throw new Error("Order konnte nicht erstellt werden");
            }
            const data = (await response.json()) as { orderId: string };
            return data.orderId;
          }}
          onApprove={async (data: OnApproveData) => {
            const response = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID }),
            });
            if (!response.ok) {
              setStatus("error");
              setErrorMessage("Zahlung konnte nicht abgeschlossen werden.");
              return;
            }
            setStatus("paid");
          }}
          onError={() => {
            setStatus("error");
            setErrorMessage("Bei der Zahlung ist ein Fehler aufgetreten.");
          }}
        />
      </PayPalScriptProvider>
      {status === "error" && errorMessage && (
        <p className="mt-2 text-sm text-red-400">{errorMessage}</p>
      )}
    </div>
  );
}
