"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import type { OrganizationType } from "@/types/cbac";
import { useCbacAuth } from "@/contexts/cbac-auth-context";
import { useState } from "react";
import { RoleSelector } from "@/components/role-selector";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { Loader2, ArrowRight, Sparkles, Users, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const { loginStakeholder, loginAdmin } = useCbacAuth();
  const { showError, showSuccess } = useErrorHandler();
  const router = useRouter();
  const [orgType, setOrgType] = useState<OrganizationType | 'admin'>('manufacturer' as OrganizationType);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      showError(new Error("Please enter both email and password."), "Login Validation");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError(new Error("Please enter a valid email address."), "Email Validation");
      return;
    }

    setIsLoading(true);

    try {
      // Check if admin login
      if (orgType === 'admin') {
        await loginAdmin(email, password);
      } else {
        // Stakeholder login with email/password
        await loginStakeholder(email, password);
      }
      showSuccess("Welcome back!", "Logged in successfully.");
    } catch (error: any) {
      showError(error, "Login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500" />
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <Link href="/verify" className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity cursor-pointer group">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:bg-white/30 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-white" strokeWidth="2">
                  <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" />
                  <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">MediTrustChain</h1>
                <p className="text-white/70 text-sm">Trusted Supply Chain</p>
              </div>
            </Link>

            {/* Main headline */}
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
              Protect Your
              <br />
              <span className="text-white/90">Pharmaceutical</span>
              <br />
              Supply Chain
            </h2>

            <p className="text-lg text-white/80 mb-10 max-w-md">
              Combat counterfeit drugs with blockchain verification. 
              Track every medicine from manufacturer to patient with complete transparency.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {[
                "Immutable blockchain records",
                "Real-time supply chain tracking",
                "Instant drug authenticity verification",
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                  className="flex items-center gap-3"
                >
                  <div className="h-2 w-2 rounded-full bg-white/80" />
                  <span className="text-white/90">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-b from-background to-muted/30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[480px]"
        >
          {/* Mobile Logo */}
          <Link href="/verify" className="lg:hidden flex items-center justify-center gap-2 mb-8 hover:opacity-80 transition-opacity">
            <Logo size="md" />
          </Link>

          <Card className="border-0 shadow-2xl shadow-primary/5 bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">Secure Login</span>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold">Welcome Back</CardTitle>
              <CardDescription className="text-base">
                Sign in to access your stakeholder dashboard
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Organization Type Selector */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Organization Type</Label>
                  <RoleSelector selectedRole={orgType} onRoleChange={setOrgType} />
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-12 px-4 bg-background/50 border-border/50 focus:border-primary transition-colors"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                    <Link 
                      href="/forgot-password" 
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="••••••••"
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 px-4 bg-background/50 border-border/50 focus:border-primary transition-colors"
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground">Patient Verification</span>
                  </div>
                </div>

                {/* Patient Verification Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base font-semibold border-2 hover:border-accent hover:bg-accent/5"
                  onClick={() => router.push('/verify')}
                >
                  <Users className="mr-2 h-5 w-5 text-accent" />
                  Verify Medicine as Patient
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground">New to MediTrustChain?</span>
                  </div>
                </div>

                {/* Admin Contact */}
                <div className="text-center pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Need access? Contact your administrator
                  </p>
                  <Link 
                    href="/admin/login"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Portal Login
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
