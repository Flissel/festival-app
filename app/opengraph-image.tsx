import { ImageResponse } from "next/og";
import { formatEventDate, getEvent } from "@/lib/event";

export const alt = "Du bist eingeladen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const event = await getEvent();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to bottom, #0a0a0a, #171717, #0a0a0a)",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 12,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Du bist eingeladen
        </div>
        <div style={{ marginTop: 24, fontSize: 96, fontWeight: 700 }}>{event.name}</div>
        <div style={{ marginTop: 24, fontSize: 36, color: "rgba(255,255,255,0.85)" }}>
          {formatEventDate(event.startsAt)}
        </div>
        <div style={{ marginTop: 16, fontSize: 28, color: "rgba(255,255,255,0.6)" }}>
          Bar &amp; Cocktails · Sound · Live-Acts
        </div>
      </div>
    ),
    size
  );
}
