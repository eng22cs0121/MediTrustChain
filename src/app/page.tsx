"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ThemeToggleClientWrapper from '@/components/theme-toggle-client-wrapper';
import { ArrowRight, CheckCircle2, Eye, Users, Truck, Sparkles, ChevronRight, Pill, Factory, Building2, Globe, Lock, Zap, Award, Star, Play, BarChart3, Clock, Shield, FileCheck, Store, Activity, Verified, TrendingUp, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Logo, LogoCompact } from '@/components/logo';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.12
    }
  }
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center glass border-b border-border/30 fixed w-full z-50">
        <div className="container mx-auto flex items-center justify-between max-w-7xl">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo size="sm" />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 px-3 py-2 rounded-lg hover:bg-primary/5 hidden md:block">
              About
            </Link>
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 px-3 py-2 rounded-lg hover:bg-primary/5 hidden md:block">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 px-3 py-2 rounded-lg hover:bg-primary/5 hidden lg:block">
              How It Works
            </Link>
            <ThemeToggleClientWrapper />
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30">
              <Link href="/login" className="flex items-center gap-1.5">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative w-full min-h-[92vh] flex items-center overflow-hidden mesh-gradient">
          {/* Background Elements */}
          <div className="absolute top-20 left-[5%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse opacity-60" />
          <div className="absolute bottom-20 right-[5%] w-[600px] h-[600px] bg-accent/15 rounded-full blur-[150px] animate-pulse opacity-60" style={{ animationDelay: '1s' }} />
          
          {/* Grid Pattern - More subtle in light mode */}
          <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--primary)/0.02)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
          
          {/* Floating Elements */}
          <div className="absolute top-32 right-[15%] hidden lg:block">
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="p-4 glass-premium rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                  <Verified className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Verified Batch</p>
                  <p className="text-sm font-semibold text-primary">MED-2026-0217</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="absolute bottom-32 left-[10%] hidden lg:block">
            <motion.div 
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="p-4 glass-premium rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Shipments</p>
                  <p className="text-sm font-semibold">24,847 Tracked</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="absolute top-48 left-[8%] hidden xl:block">
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="p-4 glass-premium rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Patients Protected</p>
                  <p className="text-sm font-semibold">2.4M+</p>
                </div>
              </div>
            </motion.div>
          </div>
          
          <div className="container mx-auto relative px-4 md:px-6 py-20 max-w-7xl">
            <motion.div 
              className="flex flex-col items-center text-center space-y-8 max-w-5xl mx-auto"
              initial="initial"
              animate="animate"
              variants={stagger}
            >
              {/* Badge */}
              <motion.div variants={fadeInUp}>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/60 backdrop-blur-md px-5 py-2 text-sm font-semibold text-primary ring-1 ring-primary/20 shadow-xl shadow-primary/10">
                  <Sparkles className="h-4 w-4" />
                  Blockchain-Powered Healthcare Security
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1 
                variants={fadeInUp}
                className="heading-hero"
              >
                Protect Your
                <br />
                <span className="text-gradient bg-gradient-to-r from-primary via-accent to-primary">
                  Pharmaceutical Supply Chain
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p 
                variants={fadeInUp}
                className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl leading-relaxed"
              >
                Combat counterfeit drugs and ensure patient safety with immutable blockchain verification. 
                Track every medicine from manufacturer to patient with complete transparency.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div 
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-4 mt-6"
              >
                <Button asChild size="lg" className="h-14 px-10 text-lg btn-premium">
                  <Link href="/login" className="flex items-center gap-2">
                    Start Free Trial
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 px-10 text-lg border-2 border-primary/20 bg-white/50 backdrop-blur-sm hover:bg-white/80 hover:scale-105 transition-all duration-300 rounded-2xl">
                  <Link href="/about" className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Learn More
                  </Link>
                </Button>
              </motion.div>

              {/* Trust badges */}
              <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-8 pt-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>HIPAA Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Award className="h-5 w-5 text-primary" />
                  <span>FDA Approved</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-5 w-5 text-primary" />
                  <span>256-bit Encryption</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5" />
          <div className="container mx-auto px-4 md:px-6 max-w-7xl relative">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: "500+", label: "Enterprise Clients", icon: Building2 },
                { value: "2.4M+", label: "Drugs Verified", icon: Pill },
                { value: "99.99%", label: "Uptime SLA", icon: Activity },
                { value: "50+", label: "Countries", icon: Globe },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-4">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-24 md:py-32 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <motion.div 
              className="text-center mb-20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="badge-primary mb-4">
                <Zap className="h-4 w-4 mr-1" />
                Simple Process
              </span>
              <h2 className="heading-section mt-4 mb-6">
                How It Works
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                Track pharmaceuticals through every step with blockchain verification
              </p>
            </motion.div>

            <div className="grid md:grid-cols-6 gap-6 lg:gap-8 relative">
              {/* Connection Line */}
              <div className="hidden md:block absolute top-20 left-[10%] right-[10%] h-1 bg-gradient-to-r from-primary via-accent to-primary rounded-full opacity-30" />
              
              {[
                { icon: Factory, title: "Manufacturing", desc: "Drug created and registered on blockchain with unique identifier" },
                { icon: FileCheck, title: "Regulator", desc: "Compliance verification and quality assurance checks" },
                { icon: Building2, title: "Distribution", desc: "Tracked through authorized distributor channels securely" },
                { icon: Truck, title: "Logistics", desc: "Real-time temperature and location monitoring" },
                { icon: Store, title: "Pharmacy", desc: "Authenticated dispensing with complete chain of custody" },
                { icon: Pill, title: "Patient", desc: "Verify authenticity instantly before use" },
              ].map((step, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col items-center text-center relative"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-2xl shadow-primary/30 mb-8 group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="h-10 w-10" />
                    <span className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-background text-foreground text-sm font-bold border-2 border-primary shadow-lg">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-24 md:py-32">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <motion.div 
              className="text-center mb-20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="badge-primary mb-4">
                <Star className="h-4 w-4 mr-1" />
                Why Choose Us
              </span>
              <h2 className="heading-section mt-4 mb-6">
                Powerful Features
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                Enterprise-grade security and transparency for the pharmaceutical industry
              </p>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: "Immutable Records",
                  description: "Every transaction is permanently recorded on the blockchain, creating an audit trail that cannot be tampered with.",
                  gradient: "from-sky-500 to-cyan-500"
                },
                {
                  icon: Eye,
                  title: "Full Transparency",
                  description: "Track your medicine's complete journey from manufacturer to pharmacy. Verify authenticity instantly.",
                  gradient: "from-accent to-primary"
                },
                {
                  icon: Users,
                  title: "Multi-Stakeholder",
                  description: "Connect manufacturers, distributors, pharmacies, regulators, and patients in one trusted platform.",
                  gradient: "from-primary to-accent"
                },
                {
                  icon: Zap,
                  title: "Real-time Tracking",
                  description: "Monitor shipments in real-time with instant alerts for temperature deviations or route changes.",
                  gradient: "from-amber-500 to-orange-500"
                },
                {
                  icon: Lock,
                  title: "Advanced Security",
                  description: "Bank-grade encryption and multi-factor authentication protect all your sensitive data.",
                  gradient: "from-purple-500 to-pink-500"
                },
                {
                  icon: Globe,
                  title: "Global Compliance",
                  description: "Meet FDA, EU MDR, and international regulatory requirements with built-in compliance tools.",
                  gradient: "from-rose-500 to-red-500"
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="card-interactive p-8"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg mb-6`}>
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-24 md:py-32">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <motion.div 
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent p-12 md:p-20 text-center text-white"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:40px_40px]" />
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px]" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-[80px]" />
              
              <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  Ready to Secure Your Supply Chain?
                </h2>
                <p className="text-xl md:text-2xl text-white/80 mb-10">
                  Join hundreds of pharmaceutical companies already protecting patients and combating counterfeits.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="h-14 px-10 text-lg bg-white text-primary hover:bg-white/90 shadow-2xl hover:scale-105 transition-all duration-300 rounded-xl font-semibold">
                    <Link href="/login" className="flex items-center gap-2">
                      Get Started Free
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-14 px-10 text-lg border-2 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all duration-300 rounded-xl">
                    <Link href="/login">
                      Sign In
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20">
        <div className="container mx-auto px-4 md:px-6 py-16 max-w-7xl">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2 space-y-4">
              <Logo size="md" />
              <p className="text-muted-foreground max-w-xs">
                Securing pharmaceutical supply chains with blockchain technology. Protecting patients worldwide.
              </p>
              <div className="flex gap-3 pt-4">
                <Link href="#" className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted hover:bg-primary/10 hover:text-primary transition-all duration-200">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </Link>
                <Link href="#" className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted hover:bg-primary/10 hover:text-primary transition-all duration-200">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </Link>
                <Link href="#" className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted hover:bg-primary/10 hover:text-primary transition-all duration-200">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="/about" className="hover:text-foreground transition-colors">Security</Link></li>
                <li><Link href="/about" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/about" className="hover:text-foreground transition-colors">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/about" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="/about" className="hover:text-foreground transition-colors">Careers</Link></li>
                <li><Link href="/about" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Cookie Policy</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">GDPR</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 MediTrustChain. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>Secured by Blockchain Technology</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
