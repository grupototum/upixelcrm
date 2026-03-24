import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, MoreHorizontal, Shield, Mail, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/coming-soon";

const users = [
  { name: "Admin uPixel", email: "admin@upixel.com", role: "Admin", status: "active" },
  { name: "João Operador", email: "joao@upixel.com", role: "Operador", status: "active" },
  { name: "Maria Gerente", email: "maria@upixel.com", role: "Gerente", status: "active" },
  { name: "Carlos Suporte", email: "carlos@upixel.com", role: "Operador", status: "inactive" },
];

export default function UsersPage() {
  return (
    <AppLayout
      title="Usuários"
      subtitle="Gestão de equipe"
      actions={<Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground"><Plus className="h-3 w-3" /> Novo Usuário</Button>}
    >
      <div className="p-6 animate-fade-in">
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {users.map((u) => (
            <div key={u.email} className="flex items-center justify-between p-4 hover:bg-card-hover transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                  {u.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{u.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> {u.role}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${u.status === "active" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                  {u.status === "active" ? "Ativo" : "Inativo"}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Permissões Granulares</h3>
              <p className="text-xs text-muted-foreground">Controle detalhado de acesso por módulo e funcionalidade</p>
            </div>
            <ComingSoonBadge />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
