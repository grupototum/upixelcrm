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
    <Sidebar collapsible="icon" className="border-r-0 ghost-border">
      {/* Logo area */}
      <div className="flex items-center h-16 px-4 justify-between">
        <img
          src={collapsed ? iconLogo : logo}
          alt="uPixel"
          className={collapsed ? "h-10 w-10" : "h-10"}
        />
        {!collapsed && (
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <SidebarContent className="pt-3 px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = item.url === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link
                        to={item.url}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-lg shadow-primary/10 translate-x-0.5"
                            : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
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

      <SidebarFooter className="ghost-border border-t p-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
              UP
            </div>
            <div className="text-xs">
              <p className="font-semibold text-foreground">uPixel Admin</p>
              <p className="text-muted-foreground">admin@upixel.com</p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
