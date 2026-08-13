import type { GoalTrend } from "@/types";

/** Cor por faixa de progresso — PRD §3.4. */
const RING_COLOR: Record<GoalTrend, string> = {
  achieved: "hsl(160, 60%, 38%)",
  on_track: "hsl(var(--success))",
  at_risk: "hsl(var(--warning))",
  behind: "hsl(var(--destructive))",
};

export function GoalProgressRing({
  percentage, trend, size = 64, strokeWidth = 6, children,
}: {
  percentage: number;
  trend: GoalTrend;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--muted))" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={RING_COLOR[trend]} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.7s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children ?? <span className="text-xs font-bold text-foreground">{Math.round(clamped)}%</span>}
      </div>
    </div>
  );
}
