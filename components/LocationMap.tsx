import { VENUE } from "@/lib/venue";

export function LocationMap() {
  const embedSrc = `https://www.google.com/maps?q=${VENUE.latitude},${VENUE.longitude}&output=embed`;

  return (
    <div className="mb-10">
      <p className="mb-2 text-center text-sm text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
        {VENUE.label}
      </p>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <iframe
          src={embedSrc}
          title="Festival-Location"
          className="h-64 w-full grayscale invert-[0.9]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <p className="mt-2 text-center text-xs text-white/60 [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">
        <a href={VENUE.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="underline">
          In Google Maps öffnen
        </a>
      </p>
    </div>
  );
}
