import { Settings, Plug, Users, User, Shield, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export function SettingsPopover() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = user?.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 shadow-2xl border-none" align="end">
        <div className="p-4 bg-card/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary uppercase">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{user?.name || "Usuário"}</p>
              <p className="text-[11px] text-muted-foreground truncate capitalize">{user?.role || "Acesso"}</p>
            </div>
          </div>
        </div>
        <Separator className="bg-border/20" />
        <div className="p-2 space-y-1">
          <SettingsItem icon={User} label="Meu Perfil" href="/profile" />
          <SettingsItem icon={Shield} label="Segurança" href="/security" />
        </div>
        <Separator className="bg-border/20" />
        <div className="p-2 space-y-1">
          <SettingsItem icon={Plug} label="Integrações" href="/integrations" />
          <SettingsItem icon={Users} label="Usuários" href="/users" />
          <SettingsItem icon={HelpCircle} label="Central de Ajuda" href="/help" />
        </div>
        <Separator className="bg-border/20" />
        <div className="p-2">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-xs font-medium"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair do sistema
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SettingsItem({ icon: Icon, label, href }: { icon: any; label: string; href: string }) {
  return (
    <Link
      to={href}
      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{label}</span>
      </div>
      <ChevronRight className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
    </Link>
  );
}
