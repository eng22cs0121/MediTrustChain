"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AboutAssistant } from "./_components/about-assistant";
import { ShieldCheck, ArrowRight, Factory, ClipboardCheck, Truck, Pill, Shield, Globe, Users, Lock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import ThemeToggleClientWrapper from "@/components/theme-toggle-client-wrapper";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export default function AboutPage() {
  const steps = [
    {
      icon: Factory,
      title: "Batch Creation",
      description: "Manufacturers register new batches of medicine on the blockchain, creating a unique and immutable digital identity for each batch.",
      color: "from-primary to-accent"
    },
    {
      icon: ClipboardCheck,
      title: "Regulatory Approval",
      description: "Regulators verify and approve batches, adding a layer of trust. This approval is recorded on the blockchain.",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: Truck,
      title: "Secure Distribution",
      description: "Distributors and pharmacies scan products at each handover point, updating the product's journey on the blockchain in real-time.",
      color: "from-orange-500 to-amber-600"
    },
    {
      icon: Pill,
      title: "Patient Verification",
      description: "Patients can instantly verify the authenticity and expiry of their medicine by scanning a QR code with our app.",
      color: "from-purple-500 to-pink-600"
    }
  ];

  const features = [
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Military-grade encryption and blockchain immutability protect all transactions."
    },
    {
      icon: Globe,
      title: "Global Compliance",
      description: "Meet FDA, EU, and international regulatory requirements with built-in compliance."
    },
    {
      icon: Users,
      title: "Multi-Stakeholder",
      description: "Connect all parties in the supply chain with role-based access control."
    },
    {
      icon: Lock,
      title: "Data Privacy",
      description: "HIPAA-compliant data handling with granular privacy controls."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center bg-background/80 backdrop-blur-xl border-b border-border/40 sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/20 shrink-0">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-base sm:text-xl font-bold tracking-tight">MediTrustChain</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <ThemeToggleClientWrapper />
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm hidden sm:inline-flex">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4">
              <Link href="/login" className="flex items-center gap-1">
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Start</span>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent dark:from-primary/10" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

          <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <motion.div
              className="max-w-4xl mx-auto text-center"
              initial="initial"
              animate="animate"
              variants={fadeInUp}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary ring-1 ring-primary/20 mb-6">
                About Our Platform
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                Revolutionizing
                <br />
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Pharmaceutical Safety
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                MediTrustChain leverages blockchain technology to bring transparency, security, and trust to the pharmaceutical supply chain. Combat counterfeit drugs and ensure patient safety.
              </p>
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-20 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <motion.div
              className="text-center mb-12 md:mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">How It Works</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-3 mb-4">
                Four Simple Steps
              </h2>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                Our blockchain-powered system ensures complete traceability at every stage
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  className="relative group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <div className="bg-card rounded-2xl border p-6 h-full transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} text-white shadow-lg mb-5 relative shrink-0`}>
                      <step.icon className="h-7 w-7" />
                      <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-bold border-2 border-primary">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                  {/* Connection arrow for desktop */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-4 transform -translate-y-1/2 text-primary/50 z-10">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 md:py-20 lg:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <motion.div
              className="text-center mb-12 md:mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">Platform Features</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-3 mb-4">
                Built for Enterprise
              </h2>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                Everything you need to secure your pharmaceutical supply chain
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="bg-card border rounded-xl p-6 text-center transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-4 shrink-0">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Assistant Section */}
        <section className="py-16 md:py-20 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <motion.div
                className="space-y-6 lg:pr-8"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">AI-Powered Support</span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                  Have Questions?
                  <br />
                  <span className="text-primary">Ask Our AI Assistant</span>
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Our intelligent assistant can help answer your questions about MediTrustChain, the pharmaceutical supply chain, and how blockchain technology ensures drug safety.
                </p>
                <ul className="space-y-3">
                  {[
                    "Learn about blockchain verification",
                    "Understand supply chain tracking",
                    "Get answers to compliance questions",
                    "Discover platform features"
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-3 text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-sm md:text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <AboutAssistant />
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 lg:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <motion.div
              className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent p-8 sm:p-12 md:p-16 text-center text-white"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              
              <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6 leading-tight">
                  Ready to Get Started?
                </h2>
                <p className="text-base sm:text-lg text-white/90 mb-6 md:mb-8 leading-relaxed">
                  Join the future of pharmaceutical supply chain security today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button asChild size="lg" className="h-11 sm:h-12 px-6 sm:px-8 bg-white text-primary hover:bg-white/90 shadow-xl w-full sm:w-auto">
                    <Link href="/login" className="flex items-center justify-center gap-2">
                      <span>Create Free Account</span>
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-11 sm:h-12 px-6 sm:px-8 border-2 border-white/30 bg-transparent text-white hover:bg-white/10 hover:border-white/50 w-full sm:w-auto">
                    <Link href="/login">Sign In</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-white shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-bold">MediTrustChain</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 MediTrustChain. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
