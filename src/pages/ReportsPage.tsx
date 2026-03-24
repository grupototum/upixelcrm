import { AppLayout } from "@/components/layout/AppLayout";
import { BarChart3, TrendingUp, Users, ArrowDownRight } from "lucide-react";
import { mockColumns, mockLeads } from "@/lib/mock-data";

export default function ReportsPage() {
  return (
    <AppLayout title="Relatórios" subtitle="Analytics e métricas">
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Taxa de Conversão</p>
            <p className="text-2xl font-bold text-foreground">23.5%</p>
            <p className="text-xs text-success flex items-center gap-1 mt-1"><TrendingUp className="h-3 w-3" /> +3.2% vs mês anterior</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Leads este Mês</p>
            <p className="text-2xl font-bold text-foreground">47</p>
            <p className="text-xs text-success flex items-center gap-1 mt-1"><TrendingUp className="h-3 w-3" /> +12%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Ticket Médio</p>
            <p className="text-2xl font-bold text-foreground">R$ 21.875</p>
            <p className="text-xs text-destructive flex items-center gap-1 mt-1"><ArrowDownRight className="h-3 w-3" /> -2.1%</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Conversão por Etapa</h2>
          <div className="space-y-3">
            {mockColumns.map((col, i) => {
              const count = mockLeads.filter((l) => l.column_id === col.id).length;
              const prevCount = i === 0 ? mockLeads.length : mockLeads.filter((l) => l.column_id === mockColumns[i - 1].id).length;
              const rate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 100;
              return (
                <div key={col.id} className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                  <span className="text-sm text-foreground w-36">{col.name}</span>
                  <div className="flex-1 bg-secondary rounded-full h-2.5">
                    <div className="h-2.5 rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: col.color }} />
                  </div>
                  <span className="text-sm font-medium text-foreground w-12 text-right">{rate}%</span>
                  <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Leads por Origem</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["Meta Ads", "Google Ads", "Indicação", "Website", "Outbound", "Evento"].map((origin) => {
              const count = mockLeads.filter((l) => l.origin === origin).length;
              return (
                <div key={origin} className="bg-secondary rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">{origin}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
