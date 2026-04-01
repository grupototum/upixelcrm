import { useState, useMemo } from "react";
import { Calculator, Users, DollarSign, Wallet, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export function CostSimulator() {
  const [contacts, setContacts] = useState([500]);
  const costPerCredit = 0.5;

  const totalCredits = contacts[0];
  const totalBrl = totalCredits * costPerCredit;

  return (
    <div className="bg-card ghost-border rounded-xl p-6 space-y-6 shadow-card hover-lift transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground font-heading">Simulador de Custos</h3>
            <p className="text-[11px] text-muted-foreground">Projete seus envios e créditos</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary px-3 uppercase tracking-tighter">
          Calculadora Live
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Quantidade de Contatos
            </Label>
            <span className="text-sm font-heading font-black text-primary">{contacts[0]}</span>
          </div>
          <Slider 
            value={contacts} 
            onValueChange={setContacts} 
            max={5000} 
            step={50} 
            className="py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-secondary/40 rounded-xl p-4 space-y-1 relative overflow-hidden group">
            <Wallet className="h-12 w-12 absolute -bottom-2 -right-2 text-primary opacity-5 group-hover:opacity-10 transition-opacity" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total em Créditos</p>
            <p className="text-lg font-heading font-black text-primary flex items-baseline gap-1">
              {totalCredits.toLocaleString()} <span className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">Cred</span>
            </p>
          </div>
          <div className="bg-secondary/40 rounded-xl p-4 space-y-1 relative overflow-hidden group">
            <DollarSign className="h-12 w-12 absolute -bottom-2 -right-2 text-success opacity-5 group-hover:opacity-10 transition-opacity" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Custo Estimado (R$)</p>
            <p className="text-lg font-heading font-black text-success flex items-baseline gap-1">
              {totalBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 pt-4">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic bg-muted/30 p-2 rounded-lg border border-border/20">
          <ArrowRight className="h-3 w-3 text-primary animate-pulse" />
          <span>O custo por crédito é de <strong>R$ 0,50</strong> (Marketing/Utility fora da janela)</span>
        </div>
      </div>
    </div>
  );
}
