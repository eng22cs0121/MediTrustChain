
"use client";

import { usePathname } from "next/navigation";
import { useCbacAuth, type OrganizationType } from "@/contexts/cbac-auth-context";
import {
  Info,
  Factory,
  Truck,
  Building,
  Gavel,
  PieChart,
  Warehouse,
  FlaskConical,
  ChevronRight,
  Shield,
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type NavItem = {
    href: string;
    label: string;
    icon: React.ElementType;
}

const navItems: Record<OrganizationType | 'admin', NavItem[]> = {
  manufacturer: [
    { href: "/dashboard/manufacturer", label: "Dashboard", icon: Factory },
    { href: "/dashboard/analytics", label: "Analytics", icon: PieChart },
  ],
  distributor: [
    { href: "/dashboard/distributor", label: "Dashboard", icon: Truck },
  ],
  logistics: [
    { href: "/dashboard/logistics", label: "Dashboard", icon: Warehouse },
  ],
  pharmacy: [
    { href: "/dashboard/pharmacy", label: "Dashboard", icon: Building },
  ],
  regulator: [
    { href: "/dashboard/regulator", label: "Dashboard", icon: Gavel },
    { href: "/dashboard/analytics", label: "Analytics", icon: PieChart },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Admin Dashboard", icon: Shield },
    { href: "/dashboard/analytics", label: "Analytics", icon: PieChart },
  ],
};

const commonItems: NavItem[] = [
    { href: "/dashboard/demo", label: "Tampering Demo", icon: FlaskConical },
    { href: "/about", label: "About / Help", icon: Info },
]

export function DashboardNav({ isMobile = false }: { isMobile?: boolean }) {
  const { organizationType, isAdmin } = useCbacAuth();
  const pathname = usePathname();
  const roleKey = isAdmin ? 'admin' : organizationType;
  const items = roleKey ? navItems[roleKey] || [] : [];

  const NavLink = ({ href, label, icon: Icon }: NavItem) => {
    const isActive = pathname === href;
    
    return (
      <Link
        href={href}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300",
          isActive 
            ? "text-primary scale-[1.02]" 
            : "text-muted-foreground hover:text-foreground hover:bg-primary/5",
          isMobile && "text-base py-3"
        )}
      >
        {/* Active indicator */}
        {isActive && !isMobile && (
          <span className="absolute inset-0 rounded-xl bg-primary/10 shadow-sm shadow-primary/5 ring-1 ring-primary/20 backdrop-blur-sm" />
        )}
        {isActive && isMobile && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-primary shadow-lg shadow-primary/50" />
        )}
        
        <Icon className={cn(
          "h-4 w-4 shrink-0 transition-all duration-200",
          isActive 
            ? "text-primary" 
            : "text-muted-foreground group-hover:text-foreground",
          isMobile && "h-5 w-5"
        )} />
        
        <span className="relative">{label}</span>
        
        {isMobile && (
          <ChevronRight className={cn(
            "ml-auto h-4 w-4 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5",
            isActive && "text-primary"
          )} />
        )}
      </Link>
    );
  };

  return (
    <nav className={cn(
        "items-center",
        isMobile ? "grid gap-1" : "hidden md:flex gap-1"
    )}>
      {/* Role-specific items */}
      <div className={cn(
        isMobile ? "space-y-1" : "flex items-center gap-1"
      )}>
        {items.map((item: NavItem) => (
          <NavLink key={item.href} {...item} />
        ))}
      </div>
      
      {/* Separator */}
      {!isMobile && items.length > 0 && (
        <div className="w-px h-6 bg-border/50 mx-2" />
      )}
      {isMobile && items.length > 0 && (
        <div className="h-px w-full bg-border/50 my-3" />
      )}
      
      {/* Common items */}
      <div className={cn(
        isMobile ? "space-y-1" : "flex items-center gap-1"
      )}>
        {commonItems.map((item: NavItem) => (
          <NavLink key={item.href} {...item} />
        ))}
      </div>
    </nav>
  );
}
