import type { LeaderboardEntry } from "@/types";

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg ${entry.isCurrentUser ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}>
      <span className="w-6 text-center text-sm shrink-0">{MEDALS[entry.rank - 1] ?? entry.rank}</span>
      <span className="text-sm text-foreground truncate flex-1">
        {entry.user.name}
        {entry.isCurrentUser && <span className="text-[10px] text-primary font-semibold ml-1.5">você</span>}
      </span>
      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
        <div
          className={`h-full rounded-full ${entry.overall_percentage >= 100 ? "bg-success" : entry.overall_percentage >= 50 ? "bg-primary" : "bg-warning"}`}
          style={{ width: `${Math.min(entry.overall_percentage, 100)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-foreground w-10 text-right shrink-0">{entry.overall_percentage}%</span>
    </div>
  );
}

/** Top 5 + posição do usuário logado (se estiver fora do top 5). */
export function GoalsLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">Sem metas individuais pra ranquear ainda.</p>;
  }

  const top5 = entries.slice(0, 5);
  const me = entries.find((e) => e.isCurrentUser);
  const meOutsideTop5 = me && !top5.includes(me);

  return (
    <div className="space-y-1">
      {top5.map((entry) => <LeaderboardRow key={entry.user.id} entry={entry} />)}
      {meOutsideTop5 && (
        <>
          <div className="text-center text-[10px] text-muted-foreground">···</div>
          <LeaderboardRow entry={me} />
        </>
      )}
    </div>
  );
}
