import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationPopover } from "./NotificationPopover";
import { SettingsPopover } from "./SettingsPopover";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between px-6 bg-background sticky top-0 z-40 ghost-border border-b shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              {title && (
                <div>
                  <h1 className="text-sm font-bold text-foreground tracking-tight">{title}</h1>
                  {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <NotificationPopover />
              <SettingsPopover />
              <div className="h-6 w-px bg-border/20 mx-1" />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
