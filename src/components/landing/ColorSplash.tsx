interface ColorSplashProps {
  color?: string;
  size?: number;
  className?: string;
}

const splashPaths = [
  // Organic blob 1
  "M45,10 C60,5 80,15 85,30 C90,50 80,70 60,75 C40,80 15,70 10,50 C5,30 25,15 45,10Z",
  // Organic blob 2
  "M50,5 C70,0 90,20 88,40 C85,65 65,80 45,78 C20,75 5,55 8,35 C12,15 30,8 50,5Z",
  // Organic blob 3
  "M40,8 C55,2 78,10 85,28 C92,48 82,72 58,80 C35,85 12,68 7,45 C2,22 20,12 40,8Z",
];

const colorPalettes = [
  { fill: "hsl(150, 40%, 85%)", opacity: 0.5 },   // soft sage green
  { fill: "hsl(340, 50%, 88%)", opacity: 0.45 },   // soft pink
  { fill: "hsl(200, 50%, 87%)", opacity: 0.45 },   // soft blue
  { fill: "hsl(40, 60%, 88%)", opacity: 0.5 },     // soft yellow/peach
  { fill: "hsl(270, 40%, 88%)", opacity: 0.4 },    // soft lavender
  { fill: "hsl(15, 55%, 87%)", opacity: 0.45 },    // soft coral
];

export const ColorSplash = ({ color, size = 100, className = "" }: ColorSplashProps) => {
  const pathIndex = Math.abs(className.length) % splashPaths.length;
  const colorIndex = Math.abs(className.length + 1) % colorPalettes.length;
  const palette = color ? { fill: color, opacity: 0.45 } : colorPalettes[colorIndex];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`absolute pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <path
        d={splashPaths[pathIndex]}
        fill={palette.fill}
        opacity={palette.opacity}
      />
    </svg>
  );
};

// Pre-defined splash variants for consistent use
export const GreenSplash = ({ size = 90, className = "" }) => (
  <ColorSplash color="hsl(150, 40%, 82%)" size={size} className={className} />
);
export const PinkSplash = ({ size = 90, className = "" }) => (
  <ColorSplash color="hsl(340, 50%, 86%)" size={size} className={className} />
);
export const BlueSplash = ({ size = 90, className = "" }) => (
  <ColorSplash color="hsl(200, 50%, 85%)" size={size} className={className} />
);
export const PeachSplash = ({ size = 90, className = "" }) => (
  <ColorSplash color="hsl(40, 60%, 86%)" size={size} className={className} />
);
export const LavenderSplash = ({ size = 90, className = "" }) => (
  <ColorSplash color="hsl(270, 40%, 86%)" size={size} className={className} />
);
export const CoralSplash = ({ size = 90, className = "" }) => (
  <ColorSplash color="hsl(15, 55%, 85%)" size={size} className={className} />
);

export default ColorSplash;
