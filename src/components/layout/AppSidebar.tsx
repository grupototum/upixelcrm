import { useState, useEffect } from "react";
import {
  LayoutDashboard, MessageSquare, Kanban, CheckSquare, Zap, Brain, BookOpen, Megaphone, Send,
  BarChart3, Globe, Plug, Upload, Users, HelpCircle, LogOut, Handshake, Copy, Database,
  Headphones, Bot, PlugZap, Settings, ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import upixelLight from "@/assets/upixel_light.png";
import upixelDark from "@/assets/upixel_dark.png";
import upixelIconLight from "@/assets/upixel_icon_light.png";
import upixelIconDark from "@/assets/upixel_icon_dark.png";

type NavLeaf = {
  title: string;
  url: string;
  icon: LucideIcon;
  masterOnly?: boolean;
};

type NavGroup = {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavLeaf[];
};

// Top-level link (sem grupo)
const dashboardLink: NavLeaf = { title: "Dashboard", url: "/", icon: LayoutDashboard };

const navGroups: NavGroup[] = [
  {
    id: "atendimento",
    title: "Atendimento",
    icon: Headphones,
    items: [
      { title: "Inbox", url: "/inbox", icon: MessageSquare },
      { title: "Tarefas", url: "/tasks", icon: CheckSquare },
    ],
  },
  {
    id: "crm",
    title: "CRM",
    icon: Kanban,
    items: [
      { title: "Pipeline", url: "/crm", icon: Kanban },
      { title: "Contatos", url: "/contacts", icon: Handshake },
      { title: "Duplicatas", url: "/duplicates", icon: Copy },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    icon: Megaphone,
    items: [
      { title: "Campanhas", url: "/campaigns", icon: Megaphone },
      { title: "Disparos", url: "/whatsapp/broadcast", icon: Send },
      { title: "Relatórios", url: "/reports", icon: BarChart3 },
    ],
  },
  {
    id: "ia",
    title: "Automação & IA",
    icon: Bot,
    items: [
      { title: "Automações", url: "/automations", icon: Zap },
      { title: "Inteligência", url: "/intelligence", icon: Brain },
      { title: "Biblioteca", url: "/alexandria/rag", icon: BookOpen },
    ],
  },
  {
    id: "conexoes",
    title: "Conexões",
    icon: PlugZap,
    items: [
      { title: "Integrações", url: "/integrations", icon: Plug },
      { title: "Google", url: "/google", icon: Globe },
    ],
  },
  {
    id: "config",
    title: "Configurações",
    icon: Settings,
    items: [
      { title: "Usuários", url: "/users", icon: Users },
      { title: "Importação", url: "/import", icon: Upload },
      { title: "Banco de Dados", url: "/database", icon: Database, masterOnly: true },
    ],
  },
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

  // Filtro de permissão aplicado em cada item dentro do grupo.
  const canSeeItem = (item: NavLeaf) =>
    canAccessModule(item.url) && (!item.masterOnly || isMaster);

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

      <SidebarContent className="pt-2 px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {/* Dashboard — link solto no topo */}
              {canSeeItem(dashboardLink) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isLeafActive(dashboardLink.url, location.pathname)} tooltip={dashboardLink.title}>
                    <Link
                      to={dashboardLink.url}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                        isLeafActive(dashboardLink.url, location.pathname)
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                      }`}
                    >
                      <dashboardLink.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span>{dashboardLink.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Grupos expansíveis */}
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
                              ? "bg-primary text-primary-foreground"
                              : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                          }`}
                        >
                          <group.icon className="h-[18px] w-[18px] shrink-0" />
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
                          <group.icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="flex-1 text-left">{group.title}</span>
                          <ChevronRight
                            className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
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
                                      ? "bg-primary text-primary-foreground"
                                      : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                                  }`}
                                >
                                  <item.icon className="h-4 w-4 shrink-0" />
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-1">
        {!collapsed && (
          <>
            <button className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
              <HelpCircle className="h-[18px] w-[18px]" />
              <span>Help</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span>Logout</span>
            </button>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
