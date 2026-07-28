// Feld aus 13 Mandalas, die sich überlagern und zu einer großen Komposition
// verschmelzen: eine dominante Scheibe oben, der Rest läuft darauf zu.
// Alle nutzen dasselbe SVG-Asset — der Browser rastert es einmal und variiert
// nur noch Größe, Drehtempo und Farbton (hue-rotate), was praktisch gratis ist.

type Disc = {
  top: number;
  left: number;
  size: number;
  hue: number;
  opacity: number;
  duration: number;
  reverse?: boolean;
};

const DISCS: Disc[] = [
  { top: -2, left: 50, size: 130, hue: 0, opacity: 0.75, duration: 96 },
  { top: 6, left: 10, size: 55, hue: 40, opacity: 0.45, duration: 120, reverse: true },
  { top: 4, left: 90, size: 60, hue: -50, opacity: 0.45, duration: 108 },
  { top: 20, left: 28, size: 45, hue: 90, opacity: 0.35, duration: 84, reverse: true },
  { top: 23, left: 74, size: 50, hue: 140, opacity: 0.35, duration: 132 },
  { top: 37, left: 6, size: 48, hue: 190, opacity: 0.3, duration: 96 },
  { top: 39, left: 94, size: 52, hue: 230, opacity: 0.3, duration: 116, reverse: true },
  { top: 53, left: 50, size: 72, hue: 280, opacity: 0.28, duration: 144 },
  { top: 63, left: 16, size: 42, hue: 320, opacity: 0.25, duration: 100, reverse: true },
  { top: 67, left: 84, size: 46, hue: 20, opacity: 0.25, duration: 124 },
  { top: 80, left: 38, size: 55, hue: 70, opacity: 0.22, duration: 112 },
  { top: 89, left: 76, size: 40, hue: 160, opacity: 0.2, duration: 92, reverse: true },
  { top: 93, left: 14, size: 38, hue: 250, opacity: 0.2, duration: 128 },
];

export function KaleidoscopeField() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {DISCS.map((disc, index) => (
        <div
          key={index}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ top: `${disc.top}%`, left: `${disc.left}%`, width: `${disc.size}%` }}
        >
          <div
            className="kaleidoscope-disc aspect-square"
            style={{
              opacity: disc.opacity,
              filter: `hue-rotate(${disc.hue}deg)`,
              animationDuration: `${disc.duration}s`,
              animationDirection: disc.reverse ? "reverse" : "normal",
            }}
          />
        </div>
      ))}
    </div>
  );
}
