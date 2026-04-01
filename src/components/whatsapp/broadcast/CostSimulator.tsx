import { useState, useMemo } from "react";
import { Calculator, Users, DollarSign, Wallet, ArrowRight, Sparkles, ShieldCheck, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { META_RATES, Template } from "@/hooks/useBroadcast";

type Category = Template["category"];

export function CostSimulator() {
  const [contacts, setContacts] = useState([500]);
  const [category, setCategory] = useState<Category>("MARKETING");
  const costPerCredit = 0.5;

  const rate = META_RATES[category] || 1;
  const totalCredits = contacts[0] * rate;
  const totalBrl = totalCredits * costPerCredit;

  const categoryLabels: Record<Category, string> = {
    MARKETING: "Marketing",
    UTILITY: "Utilidade",
    AUTHENTICATION: "Autenticação",
    SERVICE: "Serviço",
  };

  return (
    <div className="bg-card ghost-border rounded-xl p-6 space-y-6 shadow-card hover-lift transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground font-heading">Simulador de Custos Meta</h3>
            <p className="text-[11px] text-muted-foreground">Projete seus envios e créditos</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary px-3 uppercase tracking-tighter">
          Oficial API
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Category Selector */}
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Tag className="h-3 w-3" /> Categoria da Mensagem
          </Label>
          <Tabs value={category} onValueChange={(v) => setCategory(v as Category)} className="w-full">
            <TabsList className="grid grid-cols-3 p-1 bg-muted/40 h-10 rounded-lg">
              <TabsTrigger value="MARKETING" className="text-[9px] font-bold uppercase rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Mkt</TabsTrigger>
              <TabsTrigger value="UTILITY" className="text-[9px] font-bold uppercase rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Util</TabsTrigger>
              <TabsTrigger value="SERVICE" className="text-[9px] font-bold uppercase rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Serv</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-[10px] text-muted-foreground italic px-1">
            Taxa: {rate.toFixed(2)} créditos por conversa ({categoryLabels[category]})
          </p>
        </div>

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
              {Math.ceil(totalCredits).toLocaleString()} <span className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">Cred</span>
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
        <div className="flex items-start gap-2 text-[10px] text-muted-foreground italic bg-muted/30 p-3 rounded-lg border border-border/20">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <p>
            Valores baseados na rate card da Meta para o Brasil. 
            <strong> Marketing</strong> possui a maior taxa devido ao alto engajamento.
          </p>
        </div>
      </div>
    </div>
  );
}
