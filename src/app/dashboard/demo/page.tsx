"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FlaskConical,
  Shield,
  RefreshCw,
  Thermometer,
  Clock,
  MapPin,
  Package
} from "lucide-react";
import { motion } from "framer-motion";

type TamperScenario = {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  originalData: {
    batchId: string;
    drugName: string;
    manufacturer: string;
    manufactureDate: string;
    expiryDate: string;
    temperature: string;
    location: string;
    status: string;
  };
  tamperedData: {
    batchId: string;
    drugName: string;
    manufacturer: string;
    manufactureDate: string;
    expiryDate: string;
    temperature: string;
    location: string;
    status: string;
  };
  detectionMethod: string;
};

const scenarios: TamperScenario[] = [
  {
    id: "counterfeit",
    name: "Counterfeit Drug Detection",
    description: "Demonstrates how the system detects counterfeit medicines with fake batch IDs",
    icon: Package,
    originalData: {
      batchId: "BATCH-2024-001234",
      drugName: "Amoxicillin 500mg",
      manufacturer: "PharmaCorp Ltd",
      manufactureDate: "2024-01-15",
      expiryDate: "2026-01-15",
      temperature: "2-8°C",
      location: "Mumbai Warehouse",
      status: "verified"
    },
    tamperedData: {
      batchId: "BATCH-2024-001234",
      drugName: "Amoxicillin 500mg",
      manufacturer: "Fake Pharma Co",
      manufactureDate: "2024-03-01",
      expiryDate: "2027-03-01",
      temperature: "N/A",
      location: "Unknown",
      status: "counterfeit"
    },
    detectionMethod: "Blockchain hash mismatch detected. The batch ID exists but the manufacturer and dates don't match the original registration."
  },
  {
    id: "temperature",
    name: "Cold Chain Violation",
    description: "Shows detection of temperature-sensitive drugs stored outside safe range",
    icon: Thermometer,
    originalData: {
      batchId: "BATCH-2024-005678",
      drugName: "Insulin Glargine",
      manufacturer: "BioMed Industries",
      manufactureDate: "2024-02-20",
      expiryDate: "2025-02-20",
      temperature: "2-8°C (maintained)",
      location: "Cold Storage Unit A",
      status: "verified"
    },
    tamperedData: {
      batchId: "BATCH-2024-005678",
      drugName: "Insulin Glargine",
      manufacturer: "BioMed Industries",
      manufactureDate: "2024-02-20",
      expiryDate: "2025-02-20",
      temperature: "25°C (violated)",
      location: "Transit Vehicle",
      status: "compromised"
    },
    detectionMethod: "IoT sensor data shows temperature exceeded 8°C for 4 hours during transit. Product integrity cannot be guaranteed."
  },
  {
    id: "expiry",
    name: "Expiry Date Tampering",
    description: "Detects when expiry dates have been fraudulently extended",
    icon: Clock,
    originalData: {
      batchId: "BATCH-2023-009012",
      drugName: "Paracetamol 650mg",
      manufacturer: "HealthCare Pharma",
      manufactureDate: "2023-06-10",
      expiryDate: "2024-06-10",
      temperature: "Room temperature",
      location: "Retail Pharmacy",
      status: "expired"
    },
    tamperedData: {
      batchId: "BATCH-2023-009012",
      drugName: "Paracetamol 650mg",
      manufacturer: "HealthCare Pharma",
      manufactureDate: "2023-06-10",
      expiryDate: "2025-12-10",
      temperature: "Room temperature",
      location: "Retail Pharmacy",
      status: "fraudulent"
    },
    detectionMethod: "Blockchain records show original expiry date was 2024-06-10. Current package shows 2025-12-10 - a 18-month fraudulent extension."
  },
  {
    id: "diversion",
    name: "Supply Chain Diversion",
    description: "Tracks unauthorized diversion of drugs from legitimate supply chain",
    icon: MapPin,
    originalData: {
      batchId: "BATCH-2024-003456",
      drugName: "Controlled Substance XR",
      manufacturer: "SecureMed Corp",
      manufactureDate: "2024-03-05",
      expiryDate: "2025-03-05",
      temperature: "15-25°C",
      location: "Authorized Distributor - Delhi",
      status: "in-transit"
    },
    tamperedData: {
      batchId: "BATCH-2024-003456",
      drugName: "Controlled Substance XR",
      manufacturer: "SecureMed Corp",
      manufactureDate: "2024-03-05",
      expiryDate: "2025-03-05",
      temperature: "15-25°C",
      location: "Unauthorized Market - Unknown",
      status: "diverted"
    },
    detectionMethod: "GPS tracking and checkpoint data missing. Last verified location was Delhi warehouse. Product found in unauthorized market."
  }
];

export default function TamperingDemoPage() {
  const [selectedScenario, setSelectedScenario] = useState<TamperScenario | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<"original" | "tampered" | null>(null);
  const [showTampered, setShowTampered] = useState(false);

  const handleVerify = (isTampered: boolean) => {
    setIsVerifying(true);
    setVerificationResult(null);
    
    setTimeout(() => {
      setVerificationResult(isTampered ? "tampered" : "original");
      setIsVerifying(false);
    }, 2000);
  };

  const resetDemo = () => {
    setSelectedScenario(null);
    setVerificationResult(null);
    setShowTampered(false);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FlaskConical className="h-8 w-8 text-primary" />
          Tampering Detection Demo
        </h1>
        <p className="text-muted-foreground mt-2">
          Experience how MediTrustChain detects counterfeit drugs and supply chain tampering using blockchain verification
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Educational Demo</AlertTitle>
        <AlertDescription>
          This is a simulated demonstration showing how our blockchain-based verification system detects various types of pharmaceutical fraud and tampering.
        </AlertDescription>
      </Alert>

      {!selectedScenario ? (
        <div className="grid gap-4 md:grid-cols-2">
          {scenarios.map((scenario) => (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedScenario(scenario)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <scenario.icon className="h-5 w-5 text-primary" />
                    {scenario.name}
                  </CardTitle>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <selectedScenario.icon className="h-6 w-6 text-primary" />
                {selectedScenario.name}
              </h2>
              <p className="text-muted-foreground">{selectedScenario.description}</p>
            </div>
            <Button variant="outline" onClick={resetDemo}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Another Scenario
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Original/Authentic Data */}
            <Card className={!showTampered ? "ring-2 ring-primary" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Original (Blockchain Verified)
                </CardTitle>
                <CardDescription>Data as registered on the blockchain</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <DataRow label="Batch ID" value={selectedScenario.originalData.batchId} />
                <DataRow label="Drug Name" value={selectedScenario.originalData.drugName} />
                <DataRow label="Manufacturer" value={selectedScenario.originalData.manufacturer} />
                <DataRow label="Manufacture Date" value={selectedScenario.originalData.manufactureDate} />
                <DataRow label="Expiry Date" value={selectedScenario.originalData.expiryDate} />
                <DataRow label="Temperature" value={selectedScenario.originalData.temperature} />
                <DataRow label="Location" value={selectedScenario.originalData.location} />
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant="default" className="bg-green-500">
                    {selectedScenario.originalData.status.toUpperCase()}
                  </Badge>
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={() => {
                    setShowTampered(false);
                    handleVerify(false);
                  }}
                  disabled={isVerifying}
                >
                  {isVerifying && !showTampered ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Verify Original
                </Button>
              </CardContent>
            </Card>

            {/* Tampered Data */}
            <Card className={showTampered ? "ring-2 ring-destructive" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  Tampered (Fraudulent)
                </CardTitle>
                <CardDescription>Data showing signs of tampering</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <DataRow 
                  label="Batch ID" 
                  value={selectedScenario.tamperedData.batchId}
                  highlighted={selectedScenario.originalData.batchId !== selectedScenario.tamperedData.batchId}
                />
                <DataRow 
                  label="Drug Name" 
                  value={selectedScenario.tamperedData.drugName}
                  highlighted={selectedScenario.originalData.drugName !== selectedScenario.tamperedData.drugName}
                />
                <DataRow 
                  label="Manufacturer" 
                  value={selectedScenario.tamperedData.manufacturer}
                  highlighted={selectedScenario.originalData.manufacturer !== selectedScenario.tamperedData.manufacturer}
                />
                <DataRow 
                  label="Manufacture Date" 
                  value={selectedScenario.tamperedData.manufactureDate}
                  highlighted={selectedScenario.originalData.manufactureDate !== selectedScenario.tamperedData.manufactureDate}
                />
                <DataRow 
                  label="Expiry Date" 
                  value={selectedScenario.tamperedData.expiryDate}
                  highlighted={selectedScenario.originalData.expiryDate !== selectedScenario.tamperedData.expiryDate}
                />
                <DataRow 
                  label="Temperature" 
                  value={selectedScenario.tamperedData.temperature}
                  highlighted={selectedScenario.originalData.temperature !== selectedScenario.tamperedData.temperature}
                />
                <DataRow 
                  label="Location" 
                  value={selectedScenario.tamperedData.location}
                  highlighted={selectedScenario.originalData.location !== selectedScenario.tamperedData.location}
                />
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant="destructive">
                    {selectedScenario.tamperedData.status.toUpperCase()}
                  </Badge>
                </div>
                <Button 
                  variant="destructive"
                  className="w-full mt-4" 
                  onClick={() => {
                    setShowTampered(true);
                    handleVerify(true);
                  }}
                  disabled={isVerifying}
                >
                  {isVerifying && showTampered ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mr-2" />
                  )}
                  Verify Tampered
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Verification Result */}
          {verificationResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert variant={verificationResult === "original" ? "default" : "destructive"}>
                {verificationResult === "original" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {verificationResult === "original" 
                    ? "✓ Verification Successful" 
                    : "⚠ Tampering Detected!"}
                </AlertTitle>
                <AlertDescription>
                  {verificationResult === "original" 
                    ? "This product has been verified against the blockchain. All data matches the original registration. This is an authentic product."
                    : selectedScenario.detectionMethod}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function DataRow({ label, value, highlighted = false }: { label: string; value: string; highlighted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${highlighted ? "text-destructive bg-destructive/10 px-2 py-1 rounded" : ""}`}>
        {value}
      </span>
    </div>
  );
}
