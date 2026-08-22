import { useState, useEffect } from "react";
import {
  LayoutDashboard, MessageSquare, Kanban, CheckSquare, Zap, Brain, BookOpen, Megaphone, Send,
  BarChart3, Plug, HelpCircle, LogOut, Bot, Settings, ChevronRight, ShieldCheck, FileText, Clock, Upload, Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import upixelLight from "@/assets/upixel_light.png";
import upixelDark from "@/assets/upixel_dark.png";
import { CommandPaletteTrigger } from "@/components/layout/CommandPaletteTrigger";
import upixelIconLight from "@/assets/upixel_icon_light.png";
import upixelIconDark from "@/assets/upixel_icon_dark.png";

type NavLeaf = {
  title: string;
  url: string;
  icon: LucideIcon;
  masterOnly?: boolean;
  /** Optional badge count (e.g. unread inbox). null/undefined = no badge. */
  badge?: number | null;
};

type NavGroup = {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavLeaf[];
};

/**
 * Sidebar architecture (v2 — UX redesign):
 *
 * Os 5 itens MAIS usados ficam como links diretos no topo (1 clique pra chegar).
 * Os 3 grupos restantes (Marketing, IA & Automações, Configurações) ficam como
 * submenus colapsáveis abaixo. Cmd+K (próxima etapa) cobre o resto.
 *
 * Comparação:
 *   v1: 6 grupos + Dashboard = 17 itens visuais, 2 cliques pra qualquer canto
 *   v2: 5 links diretos + 3 grupos = 8 itens visuais, 1 clique pros críticos
 */

// Três blocos separados por divisor, na ordem e no agrupamento do Figma
// (arquivo "Upixel funil", node 1:2).

// "Meu dia" — o que se abre para saber onde eu estou.
const dailyLinks: NavLeaf[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Tarefas", url: "/tasks", icon: CheckSquare },
];

// "Trabalho com leads" — Inbox e Funil ficam colados aos grupos de Marketing
// e Automações, que são a continuação do mesmo fluxo. Sem divisor entre eles.
const workLinks: NavLeaf[] = [
  { title: "Inbox", url: "/inbox", icon: MessageSquare },
  { title: "Funil de Vendas", url: "/crm", icon: Kanban },
];

// Setup — uso esporádico, desce para o fim.
const setupLinks: NavLeaf[] = [
  { title: "Integrações", url: "/integrations", icon: Plug },
  { title: "Importar", url: "/import", icon: Upload },
  { title: "Configurações", url: "/settings", icon: Settings },
];

// Grupos secundários — itens usados com menos frequência, agrupados por domínio.
const navGroups: NavGroup[] = [
  {
    id: "marketing",
    title: "Marketing",
    icon: Megaphone,
    items: [
      { title: "Campanhas", url: "/campaigns", icon: Megaphone },
      { title: "Disparos", url: "/whatsapp/broadcast", icon: Send },
      { title: "Templates WhatsApp", url: "/whatsapp/templates", icon: FileText },
      { title: "Relatórios", url: "/reports", icon: BarChart3 },
      { title: "SLA & Atendimento", url: "/sla", icon: Clock },
    ],
  },
  {
    id: "ia",
    title: "Automações & IA",
    icon: Bot,
    items: [
      { title: "Automações", url: "/automations", icon: Zap },
      { title: "Inteligência", url: "/intelligence", icon: Brain },
      { title: "Biblioteca", url: "/alexandria/rag", icon: BookOpen },
    ],
  },
];

// Itens visíveis SOMENTE pra role=master (filtrados via masterOnly flag).
const masterLinks: NavLeaf[] = [
  { title: "Integrações (Master)", url: "/master/integrations", icon: ShieldCheck, masterOnly: true },
];

// Usuários e Banco vivem como tabs dentro de /settings — acessíveis via
// "Configurações" no link direto acima. Importação também tem link direto próprio.

function isLeafActive(url: string, pathname: string): boolean {
  if (url === "/") return pathname === "/";
  return pathname === url || pathname.startsWith(`${url}/`);
}

function groupContainsActive(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => isLeafActive(item.url, pathname));
}

function BadgeIndicator({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge
      variant="default"
      className="ml-auto h-4 min-w-[16px] px-1 text-[9px] font-bold bg-primary text-primary-foreground"
    >
      {count > 99 ? "99+" : count}
    </Badge>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { logout, user } = useAuth();
  const { canAccessModule } = usePermissions();

  const isMaster = user?.role === "master";
  const { inboxCount, tasksCount } = useUnreadCounts();

  // Badges vivos de não-lidos. Inbox e Tarefas caem em blocos diferentes,
  // então o mapa é aplicado em qualquer lista.
  const withBadges = (links: NavLeaf[]): NavLeaf[] =>
    links.map((link) => {
      if (link.url === "/inbox") return { ...link, badge: inboxCount };
      if (link.url === "/tasks") return { ...link, badge: tasksCount };
      return link;
    });

  // Acordeão: apenas 1 grupo aberto por vez. Auto-abre o grupo que contém a rota ativa.
  const initialOpenGroup =
    navGroups.find((g) => groupContainsActive(g, location.pathname))?.id ?? null;
  const [openGroupId, setOpenGroupId] = useState<string | null>(initialOpenGroup);

  // Se a rota muda externamente (ex: click em link de outra parte do app), garante
  // que o grupo correspondente abra. Não fecha grupos abertos pelo próprio usuário.
  useEffect(() => {
    const activeGroup = navGroups.find((g) => groupContainsActive(g, location.pathname));
    if (activeGroup && openGroupId !== activeGroup.id) {
      setOpenGroupId(activeGroup.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const logo = theme === "dark" ? upixelDark : upixelLight;
  const iconLogo = theme === "dark" ? upixelIconDark : upixelIconLight;

  // Filtro de permissão aplicado em cada item.
  const canSeeItem = (item: NavLeaf) =>
    canAccessModule(item.url) && (!item.masterOnly || isMaster);

  const renderDirectLink = (link: NavLeaf) => {
    if (!canSeeItem(link)) return null;
    const active = isLeafActive(link.url, location.pathname);
    return (
      <SidebarMenuItem key={link.url}>
        <SidebarMenuButton asChild isActive={active} tooltip={link.title}>
          <Link
            to={link.url}
            // Ativo no Figma: fundo sutil e texto BRANCO em negrito — não o
            // bloco laranja sólido de antes, nem texto laranja. O laranja fica
            // só no ícone, que já é laranja em todos os itens.
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-all duration-200 ${
              active
                ? "bg-sidebar-accent text-foreground font-semibold"
                : "text-sidebar-foreground font-medium hover:text-foreground hover:bg-sidebar-accent"
            }`}
          >
            {/* Laranja em todos os itens, ativo ou não — é assim no Figma. */}
            <link.icon className="h-[18px] w-[18px] shrink-0 text-primary" />
            {!collapsed && (
              <>
                <span className="flex-1">{link.title}</span>
                {link.badge != null && link.badge > 0 && <BadgeIndicator count={link.badge} />}
              </>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Logo — centralizada também no estado colapsado */}
      <div className="flex items-center justify-center h-16 px-2">
        <img
          src={collapsed ? iconLogo : logo}
          alt="uPixel"
          className={collapsed ? "h-8 w-8" : "h-12"}
        />
      </div>

      {/* Busca rápida. No Figma ela vive no topo da sidebar, não no header —
          é o mesmo CommandPaletteTrigger, só que largura cheia. Colapsada, o
          próprio componente cai para o ícone. */}
      <div className="px-2 pb-2">
        <CommandPaletteTrigger fullWidth={!collapsed} />
      </div>

      <SidebarContent className="pt-2 px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {/* Bloco 1 — meu dia */}
              {withBadges(dailyLinks).map(renderDirectLink)}

              {!collapsed && (
                <div className="my-2 mx-3 h-px bg-sidebar-border/60" aria-hidden />
              )}

              {/* Bloco 2 — trabalho com leads. Sem divisor antes dos grupos:
                  Marketing e Automações são a continuação do mesmo fluxo. */}
              {withBadges(workLinks).map(renderDirectLink)}

              {/* Grupos secundários */}
              {navGroups.map((group) => {
                const visibleItems = group.items.filter(canSeeItem);
                if (visibleItems.length === 0) return null;

                const groupActive = groupContainsActive(group, location.pathname);
                const isOpen = openGroupId === group.id;

                // Quando colapsado, cada grupo vira um link clicável que vai pro primeiro item.
                // Tooltip mostra o nome do grupo.
                if (collapsed) {
                  const firstItem = visibleItems[0];
                  return (
                    <SidebarMenuItem key={group.id}>
                      <SidebarMenuButton asChild isActive={groupActive} tooltip={group.title}>
                        <Link
                          to={firstItem.url}
                          aria-label={`${group.title}: abrir ${firstItem.title}`}
                          className={`flex items-center justify-center rounded-lg p-2.5 transition-all duration-200 ${
                            groupActive
                              ? "bg-sidebar-accent text-foreground"
                              : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                          }`}
                        >
                          <group.icon className="h-[18px] w-[18px] shrink-0 text-primary" />
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible
                    key={group.id}
                    open={isOpen}
                    onOpenChange={(open) => setOpenGroupId(open ? group.id : null)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={`sidebar-group-${group.id}`}
                          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                            groupActive
                              ? "text-foreground bg-sidebar-accent/50"
                              : isOpen
                                ? "text-foreground bg-sidebar-accent/30"
                                : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                          }`}
                        >
                          <group.icon className="h-[18px] w-[18px] shrink-0 text-primary" />
                          <span className="flex-1 text-left">{group.title}</span>
                          <ChevronRight
                            className={`h-3.5 w-3.5 shrink-0 text-primary transition-transform ${isOpen ? "rotate-90" : ""}`}
                          />
                        </button>
                      </CollapsibleTrigger>
                    </SidebarMenuItem>
                    <CollapsibleContent id={`sidebar-group-${group.id}`}>
                      <SidebarMenu className="space-y-0.5 mt-0.5 ml-3 pl-3 border-l border-sidebar-border">
                        {visibleItems.map((item) => {
                          const isActive = isLeafActive(item.url, location.pathname);
                          return (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                                <Link
                                  to={item.url}
                                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-all duration-200 ${
                                    isActive
                                      ? "bg-sidebar-accent text-foreground font-semibold"
                                      : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                                  }`}
                                >
                                  <item.icon className="h-4 w-4 shrink-0 text-primary" />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              {/* Bloco 3 — setup */}
              {!collapsed && (
                <div className="my-2 mx-3 h-px bg-sidebar-border/60" aria-hidden />
              )}
              {setupLinks.map(renderDirectLink)}

              {/* Links exclusivos de master — separador + render */}
              {isMaster && (
                <>
                  {!collapsed && (
                    <div className="my-2 mx-3 h-px bg-sidebar-border/60" aria-hidden />
                  )}
                  {masterLinks.map(renderDirectLink)}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-1">
        {!collapsed && (
          <>
            <Link
              to="/novidades"
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                isLeafActive("/novidades", location.pathname)
                  ? "bg-sidebar-accent text-foreground font-semibold"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
              }`}
            >
              {/* Novidades é o único ícone dourado no Figma — destaca do laranja. */}
              <Sparkles className="h-[18px] w-[18px] text-amber-400" />
              <span>Novidades</span>
            </Link>
            <button className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
              <HelpCircle className="h-[18px] w-[18px] text-primary" />
              <span>Help</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="h-[18px] w-[18px] text-primary" />
              <span>Logout</span>
            </button>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
