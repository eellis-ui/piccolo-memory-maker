import logoImg from "@/assets/piccoload-logo.png";

interface FrontCoverPreviewProps {
  gridCells: (string | null)[];
  subtitle: string;
  bottomTitle: string;
}

/**
 * Front cover layout shared between CoverStep's live preview and the PDF
 * renderer (cover-renderer.ts). The layout is sized via cqi/% units so it
 * scales correctly at any container width — the renderer mounts this at
 * preview size and captures via html-to-image at high pixel ratio.
 */
const FrontCoverPreview = ({ gridCells, subtitle, bottomTitle }: FrontCoverPreviewProps) => (
  <div
    className="relative bg-[#fffaf3] overflow-hidden flex flex-col"
    style={{ width: "100%", height: "100%", containerType: "inline-size" }}
  >
    {/* Logo region */}
    <div className="flex-1 flex items-center justify-center min-h-0">
      <img src={logoImg} alt="Piccoload" style={{ width: "50%" }} />
    </div>

    {/* 2x2 photo grid */}
    <div className="shrink-0 grid grid-cols-2" style={{ margin: "0 8.75%", gap: 0 }}>
      {gridCells.map((url, idx) => (
        <div key={idx} className="aspect-square overflow-hidden bg-[#ede8e0]">
          {url ? (
            <img
              src={url}
              alt={`Cover cell ${idx + 1}`}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full" />
          )}
        </div>
      ))}
    </div>

    {/* Bottom text */}
    <div
      className="flex-1 flex flex-col justify-start min-h-0"
      style={{ paddingRight: "8.75%" }}
    >
      <div className="flex flex-col items-end" style={{ paddingTop: "2.5%" }}>
        <p
          className="uppercase text-foreground leading-none"
          style={{
            fontFamily: "'Yuji Syuku', serif",
            fontSize: "3.9cqi",
            letterSpacing: 0,
            margin: 0,
          }}
        >
          {subtitle}
        </p>
        <p
          className="leading-none"
          style={{
            fontFamily: "Bristol, serif",
            fontSize: "4.7cqi",
            marginTop: "2.5%",
            color: "hsl(var(--foreground))",
            margin: 0,
          }}
        >
          {bottomTitle}
        </p>
      </div>
    </div>
  </div>
);

export default FrontCoverPreview;
