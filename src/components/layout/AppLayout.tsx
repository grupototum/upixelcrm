import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationPopover } from "./NotificationPopover";
import { SettingsPopover } from "./SettingsPopover";
import { CommandPalette } from "./CommandPalette";
import { CommandPaletteTrigger } from "./CommandPaletteTrigger";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Override the last breadcrumb segment label (ex: nome dinâmico do lead). */
  breadcrumbLabel?: string;
}

export function AppLayout({ children, title, subtitle, actions, breadcrumbLabel }: AppLayoutProps) {
  const breadcrumbs = useBreadcrumbs(breadcrumbLabel);
  const showBreadcrumb = breadcrumbs.length >= 2;

  return (
    <SidebarProvider>
      <CommandPalette />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between px-6 bg-background sticky top-0 z-40 ghost-border border-b shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              {showBreadcrumb ? (
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => {
                      const isLast = index === breadcrumbs.length - 1;
                      return (
                        <span key={index} className="inline-flex items-center gap-1.5">
                          {index > 0 && <BreadcrumbSeparator />}
                          <BreadcrumbItem>
                            {isLast ? (
                              <BreadcrumbPage className="text-sm font-semibold">
                                {crumb.label}
                              </BreadcrumbPage>
                            ) : crumb.to ? (
                              <BreadcrumbLink asChild>
                                <Link
                                  to={crumb.to}
                                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {crumb.label}
                                </Link>
                              </BreadcrumbLink>
                            ) : (
                              <span className="text-sm text-muted-foreground">{crumb.label}</span>
                            )}
                          </BreadcrumbItem>
                        </span>
                      );
                    })}
                  </BreadcrumbList>
                </Breadcrumb>
              ) : (
                title && (
                  <div>
                    <h1 className="text-sm font-bold text-foreground tracking-tight">{title}</h1>
                    {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
                  </div>
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              <CommandPaletteTrigger />
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
