import { useState } from "react";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, Plus, MoreHorizontal, History, 
  CheckCircle2, Clock, AlertCircle, Trash2, Edit 
} from "lucide-react";
import { useBroadcast, Template } from "@/hooks/useBroadcast";
import { TemplateCreateModal } from "./TemplateCreateModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TemplateManager() {
  const { templates, loading } = useBroadcast();
  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusIcons: Record<Template["status"], any> = {
    APPROVED: CheckCircle2,
    PENDING: Clock,
    REJECTED: AlertCircle,
    DRAFT: Edit,
  };

  const statusColors: Record<Template["status"], string> = {
    APPROVED: "bg-success/10 text-success border-success/20",
    PENDING: "bg-warning/10 text-warning border-warning/20",
    REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
    DRAFT: "bg-muted/10 text-muted-foreground border-muted-foreground/20",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-heading font-black">Modelos Oficiais</h2>
          <p className="text-xs text-muted-foreground">Gerencie e envie novos templates para aprovação da Meta</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Pesquisar modelos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64 rounded-xl bg-muted/30 border-[hsl(var(--border-strong))] focus:bg-white transition-all text-xs"
            />
          </div>
          <Button 
            onClick={() => setCreateOpen(true)}
            className="rounded-xl h-10 bg-primary hover:bg-[#e04400] font-bold text-xs gap-2 shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" /> Novo Modelo
          </Button>
        </div>
      </div>

      <div className="bg-card ghost-border rounded-card overflow-hidden shadow-card">
        <Table>
          <TableHeader className="bg-muted/10">
            <TableRow className="hover:bg-transparent border-[hsl(var(--border-strong))]">
              <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-4">Nome</TableHead>
              <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Categoria</TableHead>
              <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Conteúdo</TableHead>
              <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.length === 0 ? (
              <TableRow className="hover:bg-transparent border-none">
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                    <History className="h-12 w-12" />
                    <p className="text-sm font-bold">Nenhum modelo encontrado</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredTemplates.map((template) => {
              const Icon = statusIcons[template.status] || Clock;
              return (
                <TableRow key={template.id} className="hover:bg-muted/5 transition-colors border-[hsl(var(--border-strong))]">
                  <TableCell className="font-bold text-xs py-5">
                    <p className="text-foreground">{template.name}</p>
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">ID: {template.id.slice(0, 8)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] font-bold border-[hsl(var(--border-strong))] px-2 py-0">
                      {template.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[9px] font-bold gap-1 px-2 py-0 border ${statusColors[template.status]}`}>
                      <Icon className="h-2.5 w-2.5" />
                      {template.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs overflow-hidden">
                    <p className="text-[11px] text-muted-foreground truncate">{template.content}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted/20">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-[hsl(var(--border-strong))]">
                        <DropdownMenuItem className="text-[11px] font-bold gap-2 cursor-pointer">
                          <Edit className="h-3.5 w-3.5 text-primary" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-[11px] font-bold gap-2 cursor-pointer text-destructive">
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <TemplateCreateModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
