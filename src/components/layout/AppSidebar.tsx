import {
  LayoutDashboard, MessageSquare, Kanban, CheckSquare, Zap, Brain, Megaphone,
  BarChart3, Plug, Upload, Users, ChevronLeft,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import upixelLight from "@/assets/upixel_light.png";
import upixelDark from "@/assets/upixel_dark.png";
import upixelIconLight from "@/assets/upixel_icon_light.png";
import upixelIconDark from "@/assets/upixel_icon_dark.png";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Inbox", url: "/inbox", icon: MessageSquare },
  { title: "CRM", url: "/crm", icon: Kanban },
  { title: "Tarefas", url: "/tasks", icon: CheckSquare },
  { title: "Automações", url: "/automations", icon: Zap },
  { title: "Inteligência", url: "/intelligence", icon: Brain },
  { title: "Campanhas", url: "/campaigns", icon: Megaphone },
  { title: "Relatórios", url: "/reports", icon: BarChart3 },
  { title: "Integrações", url: "/integrations", icon: Plug },
  { title: "Importação", url: "/import", icon: Upload },
  { title: "Usuários", url: "/users", icon: Users },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { theme } = useTheme();

  const logo = theme === "dark" ? upixelDark : upixelLight;
  const iconLogo = theme === "dark" ? upixelIconDark : upixelIconLight;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border dark:border-r-[rgba(255,255,255,0.06)]">
      <div className="flex items-center h-14 px-3 border-b border-sidebar-border dark:border-b-[rgba(255,255,255,0.06)] justify-between">
        <img
          src={collapsed ? iconLogo : logo}
          alt="uPixel"
          className={collapsed ? "h-8 w-8" : "h-8"}
        />
        {!collapsed && (
          <button onClick={toggleSidebar} className="p-1 rounded-md hover:bg-sidebar-accent text-sidebar-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.url === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border dark:border-t-[rgba(255,255,255,0.06)] p-3">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              UP
            </div>
            <div className="text-xs">
              <p className="font-medium text-sidebar-foreground">uPixel Admin</p>
              <p className="text-muted-foreground">admin@upixel.com</p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
