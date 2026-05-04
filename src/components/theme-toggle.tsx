"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/50">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Switch to light theme"
        onClick={() => setTheme("light")}
        className={cn(
          "h-8 w-8 rounded-lg transition-all duration-200",
          theme === "light" 
            ? "bg-background shadow-sm text-primary" 
            : "hover:bg-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Switch to dark theme"
        onClick={() => setTheme("dark")}
        className={cn(
          "h-8 w-8 rounded-lg transition-all duration-200",
          theme === "dark" 
            ? "bg-background shadow-sm text-primary" 
            : "hover:bg-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <Moon className="h-4 w-4" />
      </Button>
    </div>
  );
}
