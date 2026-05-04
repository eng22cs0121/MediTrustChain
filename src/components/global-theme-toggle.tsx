"use client";
import { usePathname } from "next/navigation";
import ThemeToggleClientWrapper from "@/components/theme-toggle-client-wrapper";

// List of routes that already have a theme toggle in their header
const routesWithHeaderToggle = ["/", "/dashboard"];

export default function GlobalThemeToggle() {
  const pathname = usePathname();
  // Check for exact match or startsWith for dashboard subpages
  const hasHeaderToggle =
    routesWithHeaderToggle.includes(pathname) || pathname.startsWith("/dashboard");
  if (hasHeaderToggle) return null;
  return (
    <div className="fixed top-4 right-4 z-[100]">
      <ThemeToggleClientWrapper />
    </div>
  );
}
