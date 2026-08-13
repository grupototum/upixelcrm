import { LineChart, Line, ResponsiveContainer } from "recharts";

/** Mini gráfico de linha inline, sem eixos — só a tendência dos últimos pontos. */
export function GoalSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const data = points.map((value, i) => ({ i, value }));
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
