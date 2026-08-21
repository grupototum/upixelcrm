import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAppState } from "@/contexts/AppContext";
import { Plus, Search, X, Users, Handshake, Mail, Phone, Building2, ExternalLink, MoreVertical, Edit2, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadFormModal } from "@/components/crm/LeadFormModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ContactsPage() {
  const navigate = useNavigate();
  const { leads, addLead, updateLead, deleteLead, columns, loading } = useAppState();
  
  const [activeCategory, setActiveCategory] = useState<"partner" | "collaborator">("partner");
  const [search, setSearch] = useState("");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filteredContacts = useMemo(() => {
    return leads.filter(l => {
      const isCorrectCategory = l.category === activeCategory;
      const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) || 
                            l.company?.toLowerCase().includes(search.toLowerCase()) ||
                            l.email?.toLowerCase().includes(search.toLowerCase());
      return isCorrectCategory && matchesSearch;
    });
  }, [leads, activeCategory, search]);

  const handleEdit = (contact: Lead) => {
    setEditingLead(contact);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLead(id);
      toast.success("Contato removido com sucesso.");
    } catch (err) {
      toast.error("Erro ao remover contato.");
    }
  };

  // UI-PATTERNS (docs/UI-PATTERNS.md): erro mantém o modal aberto.
  const handleSave = async (data: Partial<Lead>): Promise<boolean> => {
    const ok = editingLead
      ? await updateLead(editingLead.id, data)
      : (await addLead({ ...data, category: activeCategory }, columns[0]?.id || "")) !== null;
    if (!ok) return false;
    setShowForm(false);
    setEditingLead(null);
    return true;
  };

  return (
    <AppLayout
      title="Contatos"
      subtitle={activeCategory === "partner" ? "Gestão de Parceiros e Alianças" : "Gestão de Colaboradores e Equipe"}
      actions={
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar contatos..."
              className="h-9 w-64 pl-9 text-xs rounded-xl bg-card border-[hsl(var(--border-strong))] focus:ring-primary"
            />
          </div>
          <Button 
            size="sm" 
            className="h-9 px-4 rounded-xl bg-primary hover:bg-[#e04400] text-primary-foreground font-bold gap-2 shadow-lg shadow-primary/20"
            onClick={() => { setEditingLead(null); setShowForm(true); }}
          >
            <Plus className="h-4 w-4" /> Novo {activeCategory === "partner" ? "Parceiro" : "Colaborador"}
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-6 animate-fade-in">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)} className="w-full">
          <TabsList className="bg-card border border-[hsl(var(--border-strong))] p-1 rounded-xl h-11 border-b-0">
            <TabsTrigger value="partner" className="text-xs font-bold uppercase rounded-lg px-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-2">
              <Handshake className="h-4 w-4" /> Parceiros
            </TabsTrigger>
            <TabsTrigger value="collaborator" className="text-xs font-bold uppercase rounded-lg px-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-2">
              <Users className="h-4 w-4" /> Colaboradores
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 rounded-card bg-card animate-pulse border border-[hsl(var(--border-strong))]" />
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-card rounded-card border-2 border-dashed border-[hsl(var(--border-strong))]">
            <div className="h-20 w-20 rounded-full bg-secondary/10 flex items-center justify-center mb-6">
              {activeCategory === "partner" ? <Handshake className="h-10 w-10 text-muted-foreground/40" /> : <Users className="h-10 w-10 text-muted-foreground/40" />}
            </div>
            <h3 className="text-lg font-bold text-foreground">Nenhum {activeCategory === "partner" ? "parceiro" : "colaborador"} encontrado</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Você ainda não cadastrou nenhum contato nesta categoria ou sua busca não retornou resultados.
            </p>
            <Button variant="link" className="text-primary mt-4" onClick={() => { setEditingLead(null); setShowForm(true); }}>
              Cadastrar o primeiro agora
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredContacts.map((contact) => (
              <div 
                key={contact.id}
                className="group relative bg-card hover:bg-card border border-[hsl(var(--border-strong))] hover:border-[hsl(var(--border-strong))] rounded-card p-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-card bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-xl border border-[hsl(var(--border-strong))]">
                    {contact.name.charAt(0)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-[hsl(var(--border-strong))] bg-card">
                      <DropdownMenuItem onClick={() => handleEdit(contact)} className="text-xs gap-2 cursor-pointer rounded-lg">
                        <Edit2 className="h-3.5 w-3.5" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/leads/${contact.id}`)} className="text-xs gap-2 cursor-pointer rounded-lg">
                        <ExternalLink className="h-3.5 w-3.5" /> Ver Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteTarget(contact.id)} className="text-xs gap-2 cursor-pointer rounded-lg text-destructive focus:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h4 className="text-sm font-bold text-foreground mb-1 truncate">{contact.name}</h4>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate">{contact.company || "Sem empresa"}</span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-[11px] text-foreground/70">
                    <div className="h-6 w-6 rounded-lg bg-secondary/50 flex items-center justify-center">
                      <Mail className="h-3 w-3" />
                    </div>
                    <span className="truncate">{contact.email || "Sem e-mail"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-foreground/70">
                    <div className="h-6 w-6 rounded-lg bg-secondary/50 flex items-center justify-center">
                      <Phone className="h-3 w-3" />
                    </div>
                    <span className="truncate">{contact.phone || "Sem telefone"}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[hsl(var(--border-strong))] flex items-center justify-between">
                  <Badge className="text-[9px] font-bold uppercase tracking-wider bg-secondary/20 text-muted-foreground border-none px-2 py-0.5">
                    {activeCategory === "partner" ? "Parceiro" : "Colaborador"}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-lg"
                    onClick={() => navigate(`/leads/${contact.id}`)}
                  >
                    Detalhes <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O contato será removido permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={async () => { if (deleteTarget) { await handleDelete(deleteTarget); setDeleteTarget(null); } }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LeadFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingLead(null); }}
        onSave={handleSave}
        lead={editingLead}
        columns={columns}
        defaultColumnId={columns[0]?.id || ""}
      />
    </AppLayout>
  );
}

