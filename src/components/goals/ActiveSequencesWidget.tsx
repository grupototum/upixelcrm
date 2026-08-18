import { useSequences } from "@/hooks/useSequences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ActiveSequencesWidget() {
  const { sequences, loading } = useSequences();
  const active = sequences.filter((s) => s.active);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          Cadências Ativas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : active.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma cadência ativa</p>
        ) : (
          <ul className="space-y-2">
            {active.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[180px]">{s.name}</span>
                <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                  {s.enrollment_count} leads
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          {active.length} cadência{active.length !== 1 ? "s" : ""} ativa{active.length !== 1 ? "s" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
