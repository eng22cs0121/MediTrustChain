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
import { Loader2, ShieldCheck, ArrowRight, UserPlus, Lock, Mail, User } from "lucide-react";
import { motion } from "framer-motion";

export default function SignupPage() {
  const { showError } = useErrorHandler();
  const [isLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [credentialHash, setCredentialHash] = useState('');
  const [orgType, setOrgType] = useState<OrganizationType>('manufacturer');

  const handleOrgTypeChange = (newType: "admin" | OrganizationType) => {
    if (newType !== "admin") {
      setOrgType(newType);
    }
  };

  // Note: Stakeholders are created by admin, not through self-signup
  // This page should redirect to login or show a message
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    showError(
      new Error("Stakeholder accounts are created by system administrators. Please contact your administrator to get access."),
      "Registration Not Available"
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent">
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
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">MediTrustChain</h1>
                <p className="text-white/70 text-sm">Join the Future of Healthcare</p>
              </div>
            </div>

            {/* Main headline */}
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
              Join the
              <br />
              <span className="text-white/90">Trusted Network</span>
              <br />
              Today
            </h2>

            <p className="text-lg text-white/80 mb-10 max-w-md">
              Be part of the revolution in pharmaceutical supply chain transparency.
              Create your account and start securing patient safety.
            </p>

            {/* Benefits */}
            <div className="space-y-4">
              {[
                "Free account setup in minutes",
                "Role-based access control",
                "Full blockchain integration",
              ].map((benefit, index) => (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                  className="flex items-center gap-3"
                >
                  <div className="h-2 w-2 rounded-full bg-white/80" />
                  <span className="text-white/90">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-b from-background to-muted/30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[480px]"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tight">MediTrustChain</span>
          </div>

          <Card className="border-0 shadow-2xl shadow-primary/5 bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">Get Started</span>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold">Organization Access</CardTitle>
              <CardDescription className="text-base">
                Organizations must be registered by an administrator. If you have credentials, login below.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <UserPlus className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Admin Registration Required
                    </h4>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Organizations must be registered by a system administrator. Contact your admin to receive your credentials and access the platform.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSignup} className="space-y-5">
                {/* Organization Type Selector */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Organization Type</Label>
                  <RoleSelector selectedRole={orgType} onRoleChange={handleOrgTypeChange} />
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="organization@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="h-12 pl-10 bg-background/50 border-border/50 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 6 characters"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-12 pl-10 bg-background/50 border-border/50 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Credential Hash */}
                <div className="space-y-2">
                  <Label htmlFor="credentialHash" className="text-sm font-semibold">
                    Credential Hash
                    <span className="ml-1 text-xs text-muted-foreground">(Provided by Admin)</span>
                  </Label>
                  <Input
                    id="credentialHash"
                    type="text"
                    placeholder="Enter your credential hash"
                    required
                    value={credentialHash}
                    onChange={(e) => setCredentialHash(e.target.value)}
                    disabled={isLoading}
                    className="h-12 px-4 bg-background/50 border-border/50 focus:border-primary transition-colors font-mono text-sm"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Login with Credentials
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground">Already have an account?</span>
                  </div>
                </div>

                {/* Login Link */}
                <div className="text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary/90 transition-colors"
                  >
                    Sign in instead
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
