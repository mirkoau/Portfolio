import { GlassButton, ButtonVariant } from "./components/glass-button";
import { PlasticButton, PlasticVariant } from "./components/plastic-button";
import { ArtisticButton, ArtisticVariant } from "./components/artistic-button";

const glassVariants: { variant: ButtonVariant; name: string }[] = [
  { variant: "blue", name: "Blue — Primary" },
  { variant: "mint", name: "Mint — Cool" },
  { variant: "coral", name: "Coral — Warm" },
  { variant: "lavender", name: "Lavender — Soft" },
  { variant: "silver", name: "Silver — Neutral" },
];

const plasticVariants: { variant: PlasticVariant; name: string }[] = [
  { variant: "blue", name: "Blue — Primary" },
  { variant: "mint", name: "Mint — Cool" },
  { variant: "coral", name: "Coral — Warm" },
  { variant: "lavender", name: "Lavender — Soft" },
  { variant: "silver", name: "Silver — Neutral" },
];

const artisticVariants: { variant: ArtisticVariant; name: string }[] = [
  { variant: "blue", name: "Blue — Primary" },
  { variant: "mint", name: "Mint — Cool" },
  { variant: "coral", name: "Coral — Warm" },
  { variant: "lavender", name: "Lavender — Soft" },
  { variant: "silver", name: "Silver — Neutral" },
];

export default function App() {
  return (
    <div className="size-full flex items-center justify-center bg-[#0a0707] py-16 overflow-auto">
      <div className="flex gap-28">
        {/* Glass column */}
        <div className="flex flex-col items-center gap-6">
          <span
            className="font-['Public_Sans',sans-serif] uppercase tracking-[0.12em] mb-4"
            style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.14em" }}
          >
            iOS Glass
          </span>
          {glassVariants.map(({ variant, name }) => (
            <div key={variant} className="flex flex-col items-center gap-3">
              <GlassButton variant={variant} />
              <span
                className="font-['Public_Sans',sans-serif] tracking-[0.06em] uppercase"
                style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}
              >
                {name}
              </span>
            </div>
          ))}
        </div>

        {/* Plastic column */}
        <div className="flex flex-col items-center gap-6">
          <span
            className="font-['Public_Sans',sans-serif] uppercase tracking-[0.12em] mb-4"
            style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.14em" }}
          >
            Modern Plastic
          </span>
          {plasticVariants.map(({ variant, name }) => (
            <div key={variant} className="flex flex-col items-center gap-3">
              <PlasticButton variant={variant} />
              <span
                className="font-['Public_Sans',sans-serif] tracking-[0.06em] uppercase"
                style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}
              >
                {name}
              </span>
            </div>
          ))}
        </div>

        {/* Artistic column */}
        <div className="flex flex-col items-center gap-6">
          <span
            className="font-['Public_Sans',sans-serif] uppercase tracking-[0.12em] mb-4"
            style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.14em" }}
          >
            Artistic Resin
          </span>
          {artisticVariants.map(({ variant, name }) => (
            <div key={variant} className="flex flex-col items-center gap-3">
              <ArtisticButton variant={variant} />
              <span
                className="font-['Public_Sans',sans-serif] tracking-[0.06em] uppercase"
                style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}
              >
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}