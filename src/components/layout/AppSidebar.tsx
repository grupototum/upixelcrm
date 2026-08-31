import {
  LayoutDashboard, MessageSquare, Kanban, CheckSquare, Zap, Brain, BookOpen, Megaphone, Send,
  BarChart3, Plug, HelpCircle, LogOut, Bot, Settings, ShieldCheck, FileText, Clock, Upload, Sparkles,
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
import { TreeFolder, TreeItem, TreeSection, TreeView } from "@/components/ui/animated-file-tree";
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
 * Sidebar architecture (v3 — árvore ramificada):
 *
 * Mesma informação da v2 (blocos "meu dia" / "leads" / "setup" + grupos
 * colapsáveis), agora renderizada como TreeView: seções recolhíveis, linhas de
 * ramificação e o galho ativo deslizando até o item selecionado.
 * Colapsada (modo ícone) a sidebar continua sendo uma lista simples de ícones.
 */

// "Meu dia" — o que se abre para saber onde eu estou.
const dailyLinks: NavLeaf[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Tarefas", url: "/tasks", icon: CheckSquare },
];

// "Trabalho com leads" — Inbox e Funil, com Marketing e Automações logo abaixo.
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

function isLeafActive(url: string, pathname: string): boolean {
  if (url === "/") return pathname === "/";
  return pathname === url || pathname.startsWith(`${url}/`);
}

function groupContainsActive(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => isLeafActive(item.url, pathname));
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

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const logo = theme === "dark" ? upixelDark : upixelLight;
  const iconLogo = theme === "dark" ? upixelIconDark : upixelIconLight;

  // Filtro de permissão aplicado em cada item.
  const canSeeItem = (item: NavLeaf) =>
    canAccessModule(item.url) && (!item.masterOnly || isMaster);

  // Badges vivos — Inbox e Tarefas.
  const badgeFor = (url: string): string | undefined => {
    const count = url === "/inbox" ? inboxCount : url === "/tasks" ? tasksCount : 0;
    if (!count || count <= 0) return undefined;
    return count > 99 ? "99+" : String(count);
  };

  // O id de cada TreeItem é a própria rota, então selecionar = navegar.
  const allLeaves = [...dailyLinks, ...workLinks, ...setupLinks, ...masterLinks,
    ...navGroups.flatMap((g) => g.items)];
  const selectedId =
    allLeaves.filter((leaf) => isLeafActive(leaf.url, location.pathname))
      // rota mais específica vence (ex: /whatsapp/templates sobre /whatsapp)
      .sort((a, b) => b.url.length - a.url.length)[0]?.url ?? "";

  const renderTreeItem = (link: NavLeaf) =>
    canSeeItem(link) ? (
      <TreeItem
        key={link.url}
        id={link.url}
        label={link.title}
        icon={link.icon}
        badge={badgeFor(link.url)}
      />
    ) : null;

  // Modo colapsado: ícones diretos, sem árvore.
  const renderCollapsedLink = (link: NavLeaf) => {
    if (!canSeeItem(link)) return null;
    const active = isLeafActive(link.url, location.pathname);
    return (
      <SidebarMenuItem key={link.url}>
        <SidebarMenuButton asChild isActive={active} tooltip={link.title}>
          <Link
            to={link.url}
            className={`flex items-center justify-center rounded-lg p-2.5 transition-all duration-200 ${
              active
                ? "bg-sidebar-accent text-foreground"
                : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
            }`}
          >
            <link.icon className="h-[18px] w-[18px] shrink-0 text-primary" />
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

      {/* Busca rápida — no Figma ela vive no topo da sidebar, não no header. */}
      <div className="px-2 pb-2">
        <CommandPaletteTrigger fullWidth={!collapsed} />
      </div>

      <SidebarContent className="pt-2 px-2">
        {collapsed ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {dailyLinks.map(renderCollapsedLink)}
                {workLinks.map(renderCollapsedLink)}
                {navGroups.map((group) => {
                  const visibleItems = group.items.filter(canSeeItem);
                  if (visibleItems.length === 0) return null;
                  const groupActive = groupContainsActive(group, location.pathname);
                  return (
                    <SidebarMenuItem key={group.id}>
                      <SidebarMenuButton asChild isActive={groupActive} tooltip={group.title}>
                        <Link
                          to={visibleItems[0].url}
                          aria-label={`${group.title}: abrir ${visibleItems[0].title}`}
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
                })}
                {setupLinks.map(renderCollapsedLink)}
                {isMaster && masterLinks.map(renderCollapsedLink)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <TreeView
            variant="line"
            activeColor="text-primary"
            selectedId={selectedId}
            onSelect={(url) => navigate(url)}
            className="px-0"
          >
            <TreeSection title="Meu dia">{dailyLinks.map(renderTreeItem)}</TreeSection>

            <TreeSection title="Leads">
              {workLinks.map(renderTreeItem)}

              {navGroups.map((group) => {
                const visibleItems = group.items.filter(canSeeItem);
                if (visibleItems.length === 0) return null;
                return (
                  <TreeFolder
                    key={group.id}
                    id={group.id}
                    label={group.title}
                    icon={group.icon}
                    defaultExpanded={groupContainsActive(group, location.pathname)}
                  >
                    {visibleItems.map(renderTreeItem)}
                  </TreeFolder>
                );
              })}
            </TreeSection>

            <TreeSection title="Configuração">
              {setupLinks.map(renderTreeItem)}
              {isMaster && masterLinks.map(renderTreeItem)}
            </TreeSection>
          </TreeView>
        )}
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
              <Sparkles className="h-[18px] w-[18px] text-primary" />
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
