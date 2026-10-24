// Static, decorative visual of interconnected ideas. Pure SVG + CSS, no JS.
const nodes = [
  { x: 210, y: 150, r: 9, label: "Ton idée", main: true },
  { x: 90, y: 70, r: 5, label: "Hypothèse" },
  { x: 340, y: 64, r: 5, label: "Contre-exemple" },
  { x: 70, y: 230, r: 5, label: "Concept" },
  { x: 360, y: 220, r: 6, label: "Preuve", mint: true },
  { x: 220, y: 270, r: 4, label: "Question" },
  { x: 150, y: 40, r: 3 },
  { x: 290, y: 140, r: 3 },
  { x: 140, y: 170, r: 3 },
  { x: 300, y: 285, r: 3 },
];

const edges: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 6], [2, 7], [7, 4], [3, 8], [8, 0], [5, 9], [4, 9], [1, 3],
];

export function IdeaNetwork() {
  return (
    <svg viewBox="0 0 430 320" role="img" aria-label="Illustration : une idée reliée à des hypothèses, des contre-exemples, des concepts et des preuves" className="h-auto w-full">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="210" cy="150" r="120" fill="url(#glow)" />
      {edges.map(([a, b]) => {
        const na = nodes[a]!;
        const nb = nodes[b]!;
        return (
          <line
            key={`${a}-${b}`}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            stroke="var(--border-strong)"
            strokeWidth={a === 0 ? 1.4 : 1}
            strokeDasharray={a === 0 ? undefined : "3 4"}
          />
        );
      })}
      {nodes.map((n, i) => (
        <g key={i}>
          {n.main ? <circle cx={n.x} cy={n.y} r={n.r + 8} fill="var(--accent)" opacity="0.14" /> : null}
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={n.main ? "var(--accent)" : n.mint ? "var(--mint)" : "var(--surface)"}
            stroke={n.main || n.mint ? "none" : "var(--text-subtle)"}
            strokeWidth="1.3"
          />
          {n.label ? (
            <text
              x={n.x}
              y={n.y - n.r - 9}
              textAnchor="middle"
              fontSize={n.main ? 13 : 11.5}
              fontWeight={n.main ? 600 : 500}
              fill={n.main ? "var(--text)" : "var(--text-muted)"}
              fontFamily="var(--font-sans)"
            >
              {n.label}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
