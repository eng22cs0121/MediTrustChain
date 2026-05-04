"use client";
import { ThemeToggle } from "@/components/theme-toggle";

import { useEffect, useState } from "react";

export default function ThemeToggleClientWrapper() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return <ThemeToggle />;
}
