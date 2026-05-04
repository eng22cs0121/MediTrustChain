"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCbacAuth } from "@/contexts/cbac-auth-context";
import { MotionDiv } from "@/components/motion-div";
import { ShieldCheck, Truck, Factory, Cross, CheckCircle2 } from "lucide-react";

export function RoleOnboardingModal() {
  const { user, stakeholder } = useCbacAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user || !stakeholder) return;
    
    // Check if they've seen the onboarding for this role
    const storageKey = `meditrust_onboarding_${user.id}_${stakeholder.role}`;
    const hasSeen = localStorage.getItem(storageKey);
    
    if (!hasSeen) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, stakeholder]);

  if (!stakeholder) return null;

  const handleComplete = () => {
    localStorage.setItem(`meditrust_onboarding_${user?.id}_${stakeholder.role}`, "true");
    setIsOpen(false);
  };

  const getRoleContent = () => {
    switch (stakeholder.role) {
      case "regulator":
        return [
          {
            title: "Welcome, Regulator",
            description: "You have ultimate oversight over the pharmaceutical supply chain.",
            icon: <ShieldCheck className="w-16 h-16 text-primary mb-4 mx-auto" />
          },
          {
            title: "Approve Batches",
            description: "Review pending batches submitted by manufacturers. Your approval is recorded immutably on the blockchain.",
            icon: <CheckCircle2 className="w-16 h-16 text-success mb-4 mx-auto" />
          },
          {
            title: "Monitor Anomalies",
            description: "Use the Alert Inbox to investigate AI-flagged anomalies like temperature excursions or suspicious transit times.",
            icon: <ShieldCheck className="w-16 h-16 text-warning mb-4 mx-auto" />
          }
        ];
      case "manufacturer":
        return [
          {
            title: "Welcome, Manufacturer",
            description: "You are the origin point for the trusted supply chain.",
            icon: <Factory className="w-16 h-16 text-primary mb-4 mx-auto" />
          },
          {
            title: "Create Batches",
            description: "Register new pharmaceutical batches on the blockchain. Ensure you use approved drug templates.",
            icon: <CheckCircle2 className="w-16 h-16 text-success mb-4 mx-auto" />
          },
          {
            title: "Print QR Codes",
            description: "Print track-and-trace QR codes to attach to physical batches for downstream scanning.",
            icon: <Factory className="w-16 h-16 text-blue-500 mb-4 mx-auto" />
          }
        ];
      case "distributor":
        return [
          {
            title: "Welcome, Logistics",
            description: "You ensure safe transit from factory to pharmacy.",
            icon: <Truck className="w-16 h-16 text-primary mb-4 mx-auto" />
          },
          {
            title: "Update Locations",
            description: "Scan QR codes at various checkpoints to log the GPS location and timestamp on the blockchain.",
            icon: <CheckCircle2 className="w-16 h-16 text-success mb-4 mx-auto" />
          }
        ];
      case "pharmacy":
        return [
          {
            title: "Welcome, Pharmacy",
            description: "You are the final checkpoint before the patient.",
            icon: <Cross className="w-16 h-16 text-primary mb-4 mx-auto" />
          },
          {
            title: "Verify Authenticity",
            description: "Scan incoming batches to verify they haven't been tampered with or rejected by regulators.",
            icon: <CheckCircle2 className="w-16 h-16 text-success mb-4 mx-auto" />
          },
          {
            title: "Dispense to Patient",
            description: "Mark batches as 'Sold' to complete the supply chain journey.",
            icon: <Cross className="w-16 h-16 text-blue-500 mb-4 mx-auto" />
          }
        ];
      default:
        return [
          {
            title: "Welcome to MediTrustChain",
            description: "The secure pharmaceutical supply chain platform.",
            icon: <ShieldCheck className="w-16 h-16 text-primary mb-4 mx-auto" />
          }
        ];
    }
  };

  const content = getRoleContent();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <MotionDiv
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="py-6 text-center"
        >
          {content[step].icon}
          <DialogTitle className="text-2xl mb-2">{content[step].title}</DialogTitle>
          <DialogDescription className="text-base">
            {content[step].description}
          </DialogDescription>
        </MotionDiv>
        
        <DialogFooter className="flex-row sm:justify-between items-center w-full mt-4">
          <div className="flex gap-1">
            {content.map((_, i) => (
              <div 
                key={i} 
                className={`h-2 w-2 rounded-full transition-colors ${i === step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
            )}
            {step < content.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>Next</Button>
            ) : (
              <Button onClick={handleComplete}>Get Started</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
