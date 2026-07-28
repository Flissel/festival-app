// Generative "Mathe-Kunst": fraktales Perlin-Rauschen (feTurbulence), durch einen
// Keil beschnitten und 12-fach abwechselnd gespiegelt rotiert — das ergibt die
// Symmetriegruppe eines Kaleidoskops. Rein deklaratives SVG, kein Bild, kein JS.

const SEGMENTS = 12;
const CENTER = 200;
const RADIUS = 320;

// Halber Öffnungswinkel eines Keils, in Bogenmaß.
const HALF_ANGLE = Math.PI / SEGMENTS;

const edgeX = CENTER + RADIUS * Math.cos(HALF_ANGLE);
const edgeTopY = CENTER - RADIUS * Math.sin(HALF_ANGLE);
const edgeBottomY = CENTER + RADIUS * Math.sin(HALF_ANGLE);

const WEDGE_PATH = [
  `M ${CENTER} ${CENTER}`,
  `L ${edgeX.toFixed(2)} ${edgeTopY.toFixed(2)}`,
  `A ${RADIUS} ${RADIUS} 0 0 1 ${edgeX.toFixed(2)} ${edgeBottomY.toFixed(2)}`,
  "Z",
].join(" ");

export function Kaleidoscope({ className = "" }: { className?: string }) {
  return (
    <div className={`kaleidoscope ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 400" className="h-full w-full" role="presentation">
        <defs>
          <filter id="k-noise" x="0" y="0" width="100%" height="100%">
            {/* Höhere Frequenz + mehr Oktaven = feinere, kristallinere Struktur
                statt weicher Farbwolken. */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.03"
              numOctaves="5"
              seed="7"
              result="noise"
            />
            {/* Rauschen in kräftige, aber zum dunklen Layout passende Farben übersetzen */}
            <feColorMatrix
              in="noise"
              type="matrix"
              values="1.6 -0.4  0.5 0 -0.15
                      0.2  1.1 -0.5 0 -0.10
                      0.9 -0.2  1.7 0 -0.20
                      0    0    0   0  1"
              result="tinted"
            />
            <feComponentTransfer in="tinted">
              <feFuncR type="gamma" exponent="1.8" />
              <feFuncG type="gamma" exponent="2.2" />
              <feFuncB type="gamma" exponent="1.5" />
            </feComponentTransfer>
          </filter>

          <clipPath id="k-wedge">
            <path d={WEDGE_PATH} />
          </clipPath>

          {/* Weicher Rand, damit die Scheibe nicht hart abgeschnitten wirkt */}
          <radialGradient id="k-fade">
            <stop offset="30%" stopColor="white" stopOpacity="1" />
            <stop offset="72%" stopColor="white" stopOpacity="0.35" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="k-mask">
            <rect width="400" height="400" fill="url(#k-fade)" />
          </mask>

          {/* Die Rauschfläche deckt genau die Bounding-Box des Keils ab — größer
              wäre reine Rechenlast, kleiner ließe den Außenrand leer. */}
          <g id="k-slice" clipPath="url(#k-wedge)">
            <rect x="195" y="110" width="330" height="180" filter="url(#k-noise)" />
          </g>
        </defs>

        <g mask="url(#k-mask)" className="kaleidoscope-spin">
          {Array.from({ length: SEGMENTS }, (_, index) => {
            const angle = (360 / SEGMENTS) * index;
            // Jeder zweite Keil wird gespiegelt — erst das erzeugt die Achsen-
            // symmetrie, die ein Kaleidoskop von bloßer Rotation unterscheidet.
            const flip = index % 2 === 1 ? ` scale(1 -1) translate(0 ${-2 * CENTER})` : "";
            return (
              <use
                key={index}
                href="#k-slice"
                transform={`rotate(${angle} ${CENTER} ${CENTER})${flip}`}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
