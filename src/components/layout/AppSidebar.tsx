import {
  LayoutDashboard, MessageSquare, Kanban, CheckSquare, Zap, Brain, Megaphone,
  BarChart3, Plug, Upload, Users, Plus, HelpCircle, LogOut,
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
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 justify-center">
        <img
          src={collapsed ? iconLogo : logo}
          alt="uPixel"
          className={collapsed ? "h-12 w-12" : "h-12"}
        />
      </div>

      <SidebarContent className="pt-2 px-2">
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
                            ? "bg-primary text-primary-foreground"
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

      <SidebarFooter className="p-3 space-y-1">
        {!collapsed && (
          <>
            <button className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-primary-foreground bg-primary hover:bg-primary-hover transition-colors">
              <Plus className="h-[18px] w-[18px]" />
              <span>+ New Record</span>
            </button>
            <button className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
              <HelpCircle className="h-[18px] w-[18px]" />
              <span>Help</span>
            </button>
            <button className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
              <LogOut className="h-[18px] w-[18px]" />
              <span>Logout</span>
            </button>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
