import { CreditCard, TrendingUp, BarChart, Zap, ArrowUpRight, ArrowDownRight, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CostSimulator } from "./CostSimulator";
import { RechargeModal } from "./RechargeModal";
import { useState } from "react";

export function BroadcastDashboard({ credits, loadingCredits }: { credits: number, loadingCredits?: boolean }) {
  const [rechargeOpen, setRechargeOpen] = useState(false);

  const stats = [
    { label: "Total Enviado", value: "12,450", change: "+12%", trend: "up", icon: Zap, color: "text-primary bg-primary/10" },
    { label: "Custo Mensal", value: "R$ 450,00", change: "-5%", trend: "down", icon: TrendingUp, color: "text-success bg-success/10" },
    { label: "Uso Médio", value: "415 msg/dia", change: "+2%", trend: "up", icon: BarChart, color: "text-accent bg-accent/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Credits */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 bg-primary text-primary-foreground rounded-2xl p-6 shadow-lg shadow-primary/20 flex flex-col justify-between relative overflow-hidden group">
          <CreditCard className="h-24 w-24 absolute -bottom-4 -right-4 text-white opacity-10 group-hover:rotate-12 transition-transform duration-500" />
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Saldo Atual</p>
            <div className="flex items-center gap-2">
              <h2 className="text-4xl font-heading font-black tracking-tighter">
                {loadingCredits ? <Loader2 className="h-8 w-8 animate-spin" /> : credits.toLocaleString()}
              </h2>
            </div>
          </div>
          <div className="pt-6 space-y-4">
            <p className="text-[10px] font-medium opacity-70">
              {credits > 0 ? `Suficiente para ~${Math.floor(credits)} envios pagos` : "Você não possui créditos para disparos pagos."}
            </p>
            <button 
              onClick={() => setRechargeOpen(true)}
              className="w-full h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-bold transition-all border border-white/20 active:scale-95"
            >
              Recarregar Créditos
            </button>
          </div>
        </div>

        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-card ghost-border rounded-xl p-5 space-y-4 hover:shadow-card transition-all">
              <div className="flex items-center justify-between">
                <div className={`h-10 w-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <Badge variant={stat.trend === "up" ? "success" : "destructive"} className="text-[9px] gap-0.5 font-bold uppercase py-0 px-1.5 border-0">
                  {stat.trend === "up" ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                  {stat.change}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl font-heading font-black text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <RechargeModal open={rechargeOpen} onOpenChange={setRechargeOpen} />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Campaigns (Mini Table Mock) */}
          <div className="bg-card ghost-border rounded-xl overflow-hidden shadow-card">
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-primary" /> Histórico de Disparos
              </h3>
              <button className="text-[10px] font-bold text-primary hover:underline">Ver tudo</button>
            </div>
            <div className="p-0">
              <table className="w-full text-xs">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-4 font-bold text-muted-foreground">Campanha</th>
                    <th className="text-center p-4 font-bold text-muted-foreground">Status</th>
                    <th className="text-center p-4 font-bold text-muted-foreground">Custos</th>
                    <th className="text-right p-4 font-bold text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {[
                    { name: "Promocional Black Friday", status: "Concluído", cost: "500 cred", date: "Ontem" },
                    { name: "Aviso de Vencimento", status: "Em andamento", cost: "12 cred", date: "Hoje" },
                    { name: "Recuperação de Carrinho", status: "Concluído", cost: "0 cred", date: "2 dias atrás" },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-bold text-foreground/80">{row.name}</td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-success/30 text-success bg-success/5">
                          {row.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-center font-heading font-black text-primary/80">{row.cost}</td>
                      <td className="p-4 text-right text-muted-foreground text-[10px] font-medium">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <CostSimulator />
        </div>
      </div>
    </div>
  );
}
