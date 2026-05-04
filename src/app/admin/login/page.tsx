"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCbacAuth } from "@/contexts/cbac-auth-context";
import { useErrorHandler } from "@/hooks/use-error-handler";

export default function AdminLoginPage() {
  const router = useRouter();
  const { loginAdmin, isLoading } = useCbacAuth();
  const { showError } = useErrorHandler();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    console.log("[AdminLogin] Starting login attempt for:", email);

    if (!email || !password) {
      showError(new Error("Please enter both email and password."), "Admin Login");
      return;
    }

    setLoginLoading(true);
    try {
      console.log("[AdminLogin] Calling loginAdmin...");
      await loginAdmin(email, password);
      console.log("[AdminLogin] Login successful, redirecting...");
      router.push("/dashboard/admin");
    } catch (error: any) {
      console.error("[AdminLogin] Login failed:", error);
      showError(error, "Admin Login Failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-sky-900 to-slate-900 p-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none" />

      <motion.div
        initial="initial"
        animate="animate"
        variants={fadeInUp}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-primary/20 shadow-2xl bg-background/95 backdrop-blur">
          <CardHeader className="space-y-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/90 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30"
            >
              <Shield className="w-10 h-10 text-white" />
            </motion.div>

            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Admin Portal
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Sign in to access system administration
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 border-muted-foreground/20 focus:border-primary"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 border-muted-foreground/20 focus:border-primary"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Admin access is restricted and monitored. Unauthorized access attempts will be logged.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white font-medium shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-[1.02]"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In to Admin Portal
                    <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>

              {/* Stakeholder Login Link */}
              <div className="text-center pt-4 border-t border-border">
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Not an admin? <span className="text-primary hover:text-primary/80 font-medium">Sign in as stakeholder</span>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
