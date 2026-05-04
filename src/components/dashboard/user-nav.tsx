"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { useCbacAuth, type OrganizationType } from "@/contexts/cbac-auth-context";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Moon, Sun, LogOut, Users, ChevronDown, Palette } from "lucide-react";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { Badge } from "@/components/ui/badge";

export function UserNav() {
  const { user, organizationType, isAdmin, logout } = useCbacAuth();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { showError } = useErrorHandler();

  const displayRole = isAdmin ? 'admin' : organizationType;

  const handleLogout = async (e?: Event) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    console.log("Logout initiated from UserNav");
    try {
      if (typeof window !== 'undefined') {
        // Direct feedback since logs might be missed
        console.log("Attempting to call logout...");
      }
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      showError(error, "Logout");
      // Fallback
      window.location.href = "/login";
    }
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(' ');
      return names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return displayRole?.substring(0, 2).toUpperCase() || "U";
  };

  const getUserEmail = () => {
    return user?.email || "user@example.com";
  };

  const getUserName = () => {
    return user?.user_metadata?.full_name || "User";
  };

  const getRoleBadgeColor = (roleValue: string | null | undefined) => {
    const colors: Record<string, string> = {
      manufacturer: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      distributor: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      logistics: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      pharmacy: "bg-green-500/10 text-green-600 dark:text-green-400",
      regulator: "bg-red-500/10 text-red-600 dark:text-red-400",
      admin: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    };
    return roleValue ? colors[roleValue] || "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative flex items-center gap-2 h-10 px-2 rounded-xl hover:bg-muted/80 transition-colors">
          <Avatar className="h-8 w-8 border-2 border-primary/20">
            <AvatarImage src={`https://avatar.vercel.sh/${getUserEmail()}.png`} alt={getUserName()} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs font-semibold">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium leading-none">{getUserName()}</span>
            <span className={`text-[10px] font-medium capitalize px-1.5 py-0.5 rounded mt-0.5 ${getRoleBadgeColor(displayRole)}`}>
              {displayRole || "User"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage src={`https://avatar.vercel.sh/${getUserEmail()}.png`} alt={getUserName()} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none">{getUserName()}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {getUserEmail()}
              </p>
              <span className={`text-[10px] font-medium capitalize px-1.5 py-0.5 rounded w-fit mt-1 ${getRoleBadgeColor(displayRole)}`}>
                {displayRole || "User"}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <Palette className="mr-2 h-4 w-4" />
              <span>Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                  System
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onSelect={handleLogout} 
          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-500/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
