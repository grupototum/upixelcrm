import { forwardRef } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";

export const ThemeToggle = forwardRef<HTMLButtonElement>((_, ref) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button ref={ref} variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 text-muted-foreground">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
});

ThemeToggle.displayName = "ThemeToggle";
