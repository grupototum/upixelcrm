import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup,
  CommandItem, CommandShortcut, CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, MessageSquare, Kanban, CheckSquare, Zap, Brain, BookOpen,
  Megaphone, Send, BarChart3, Plug, Upload, Users, Database, Shield, User,
  Plus, MessageCirclePlus, Moon, Sun, LogOut, Building2, Handshake, Copy,
  Globe, MessageCircle, Instagram, Facebook, TrendingUp, Bot, Settings, BookText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/lib/theme";
import { usePermissions } from "@/hooks/usePermissions";

type CommandAction = {
  id: string;
  title: string;
  hint?: string;
  icon: LucideIcon;
  keywords?: string[];
  shortcut?: string;
  perform: () => void | Promise<void>;
};

const RECENTS_KEY = "upixel:command-palette:recents";
const MAX_RECENTS = 5;

function readRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string").slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function writeRecent(id: string) {
  if (typeof window === "undefined") return;
  const current = readRecents();
  const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX_RECENTS);
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>(() => readRecents());
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuth();
  const { canAccessModule } = usePermissions();

  const isMaster = user?.role === "master";

  // Global ⌘K / Ctrl+K shortcut + custom event from CommandPaletteTrigger
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const openEvent = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("upixel:open-command-palette", openEvent);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("upixel:open-command-palette", openEvent);
    };
  }, []);

  const go = useCallback(
    (url: string, id: string) => {
      writeRecent(id);
      setRecents(readRecents());
      setOpen(false);
      navigate(url);
    },
    [navigate],
  );

  const runAction = useCallback(
    (id: string, fn: () => void | Promise<void>) => {
      writeRecent(id);
      setRecents(readRecents());
      setOpen(false);
      void fn();
    },
    [],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Catálogo de comandos. Cada um tem um id estável (usado em localStorage de
  // recentes) e um perform que executa a ação.
  // ─────────────────────────────────────────────────────────────────────────────
  const allCommands: CommandAction[] = useMemo(() => {
    const nav = (id: string, title: string, url: string, icon: LucideIcon, keywords?: string[]): CommandAction => ({
      id,
      title,
      icon,
      keywords,
      perform: () => go(url, id),
    });

    return [
      // ── Ações rápidas ──
      {
        id: "act:new-lead",
        title: "Criar novo lead",
        hint: "Abrir formulário de novo lead",
        icon: Plus,
        keywords: ["criar", "lead", "novo", "contato", "add"],
        shortcut: "⇧L",
        perform: () => go("/crm?new=1", "act:new-lead"),
      },
      {
        id: "act:open-inbox-unread",
        title: "Próxima conversa não lida",
        hint: "Pula direto pra próxima mensagem que precisa de resposta",
        icon: MessageCirclePlus,
        keywords: ["inbox", "responder", "unread", "nao lida", "conversa"],
        perform: () => go("/inbox?filter=unread", "act:open-inbox-unread"),
      },
      {
        id: "act:connect-channel",
        title: "Conectar novo canal",
        hint: "Abre lista de integrações disponíveis",
        icon: Plug,
        keywords: ["whatsapp", "facebook", "instagram", "conectar", "canal", "integration"],
        perform: () => go("/integrations", "act:connect-channel"),
      },
      {
        id: "act:new-task",
        title: "Criar tarefa",
        icon: CheckSquare,
        keywords: ["tarefa", "task", "todo", "criar"],
        perform: () => go("/tasks?new=1", "act:new-task"),
      },

      // ── Navegação principal ──
      nav("nav:dashboard", "Dashboard", "/", LayoutDashboard, ["home", "início", "inicio"]),
      nav("nav:inbox", "Inbox", "/inbox", MessageSquare, ["mensagens", "chat", "conversas"]),
      nav("nav:tasks", "Tarefas", "/tasks", CheckSquare, ["task", "todo"]),
      nav("nav:crm", "Funil de Vendas", "/crm", Kanban, ["funil", "kanban", "crm", "pipeline"]),
      nav("nav:contacts", "Contatos", "/contacts", Handshake, ["leads", "contatos", "address"]),
      nav("nav:duplicates", "Detecção de duplicatas", "/duplicates", Copy, ["duplicates", "dedup"]),

      // ── Marketing ──
      nav("nav:campaigns", "Campanhas", "/campaigns", Megaphone, ["marketing", "campaign"]),
      nav("nav:broadcast", "Disparos WhatsApp", "/whatsapp/broadcast", Send, ["disparo", "broadcast", "envio em massa"]),
      nav("nav:reports", "Relatórios", "/reports", BarChart3, ["relatorios", "metrics", "kpi"]),

      // ── Automação & IA ──
      nav("nav:automations", "Automações", "/automations", Zap, ["bots", "rules", "automacao"]),
      nav("nav:intelligence", "Inteligência Artificial", "/intelligence", Brain, ["ai", "ia", "chat", "agents"]),
      nav("nav:rag", "Biblioteca (RAG)", "/alexandria/rag", BookOpen, ["knowledge", "documentos", "alexandria"]),

      // ── Integrações & canais ──
      nav("nav:integrations", "Integrações (todas)", "/integrations", Plug, ["channels", "providers"]),
      nav("nav:whatsapp", "WhatsApp", "/integrations", MessageCircle, ["wpp", "chat", "lite", "cloud", "templates", "hsm"]),
      nav("nav:facebook-page", "Facebook Messenger", "/facebook-page", Facebook, ["fb", "messenger", "page"]),
      nav("nav:instagram", "Instagram Direct", "/instagram", Instagram, ["ig", "direct", "dm"]),
      nav("nav:meta-ads", "Meta Ads", "/meta-ads", Megaphone, ["fb ads", "anuncios", "facebook ads"]),
      nav("nav:google-ads", "Google Ads", "/google-ads", TrendingUp, ["adwords", "google", "anuncios"]),
      nav("nav:google", "Google Workspace", "/google", Globe, ["gmail", "calendar", "drive"]),

      // ── Settings / Admin ──
      nav("nav:settings", "Configurações", "/settings", Settings, ["settings", "config", "ajustes"]),
      nav("nav:profile", "Meu Perfil", "/settings/profile", User, ["account", "conta", "user"]),
      nav("nav:security", "Segurança", "/settings/security", Shield, ["password", "senha", "2fa"]),
      nav("nav:users", "Equipe e usuários", "/users", Users, ["team", "users", "equipe", "papeis"]),
      nav("nav:import", "Importação de leads", "/import", Upload, ["csv", "import", "planilha", "xlsx"]),
      ...(isMaster
        ? [nav("nav:database", "Banco de dados (backup)", "/database", Database, ["backup", "master", "db"])]
        : []),

      // ── Sistema ──
      {
        id: "sys:theme-toggle",
        title: theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro",
        icon: theme === "dark" ? Sun : Moon,
        keywords: ["theme", "dark", "light", "tema", "claro", "escuro"],
        perform: () => runAction("sys:theme-toggle", () => setTheme(theme === "dark" ? "light" : "dark")),
      },
      {
        id: "sys:logout",
        title: "Sair (Logout)",
        icon: LogOut,
        keywords: ["logout", "sair", "exit", "sign out"],
        perform: () => runAction("sys:logout", async () => {
          await logout();
          navigate("/login");
        }),
      },
      ...(user?.tenant_id
        ? [{
            id: "sys:tenant-info",
            title: `Tenant: ${user.tenant_id.slice(0, 8)}…`,
            hint: "Identificador da organização atual",
            icon: Building2,
            keywords: ["tenant", "org", "company"],
            perform: () => runAction("sys:tenant-info", () => navigate("/profile")),
          }]
        : []),
    ];
  }, [go, runAction, theme, setTheme, logout, navigate, user?.tenant_id, isMaster]);

  // Apenas comandos que o usuário pode ver (respeita permissões de rota).
  const visibleCommands = useMemo(
    () => allCommands.filter((c) => {
      // Só checamos permissão de navegação. Ações e sistema sempre disponíveis.
      if (!c.id.startsWith("nav:")) return true;
      const url = c.perform.toString().match(/['"`](\/[^'"`]*?)['"`]/)?.[1];
      return url ? canAccessModule(url) : true;
    }),
    [allCommands, canAccessModule],
  );

  // Separa por categorias.
  const actions = visibleCommands.filter((c) => c.id.startsWith("act:"));
  const sysItems = visibleCommands.filter((c) => c.id.startsWith("sys:"));
  const navItems = visibleCommands.filter((c) => c.id.startsWith("nav:"));

  // Recentes — preserva ordem do localStorage e filtra IDs que não existem mais
  // ou que o usuário não pode ver.
  const recentItems = recents
    .map((id) => visibleCommands.find((c) => c.id === id))
    .filter((c): c is CommandAction => !!c);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar ou executar comando… (⌘K)" />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {recentItems.length > 0 && (
          <>
            <CommandGroup heading="Recentes">
              {recentItems.map((cmd) => (
                <CommandItem
                  key={`recent-${cmd.id}`}
                  value={`recent ${cmd.title} ${cmd.keywords?.join(" ") ?? ""}`}
                  onSelect={cmd.perform}
                >
                  <cmd.icon className="mr-2 h-4 w-4 shrink-0" />
                  <span>{cmd.title}</span>
                  {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {actions.length > 0 && (
          <CommandGroup heading="Ações">
            {actions.map((cmd) => (
              <CommandItem
                key={cmd.id}
                value={`${cmd.title} ${cmd.keywords?.join(" ") ?? ""}`}
                onSelect={cmd.perform}
              >
                <cmd.icon className="mr-2 h-4 w-4 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span>{cmd.title}</span>
                  {cmd.hint && <span className="text-[10px] text-muted-foreground">{cmd.hint}</span>}
                </div>
                {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {navItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Navegar">
              {navItems.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  value={`${cmd.title} ${cmd.keywords?.join(" ") ?? ""}`}
                  onSelect={cmd.perform}
                >
                  <cmd.icon className="mr-2 h-4 w-4 shrink-0" />
                  <span>{cmd.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {sysItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Sistema">
              {sysItems.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  value={`${cmd.title} ${cmd.keywords?.join(" ") ?? ""}`}
                  onSelect={cmd.perform}
                >
                  <cmd.icon className="mr-2 h-4 w-4 shrink-0" />
                  <span>{cmd.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
