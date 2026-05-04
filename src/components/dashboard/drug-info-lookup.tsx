"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DrugInfo {
  name: string;
  genericName: string;
  manufacturer: string;
  category: string;
  description: string;
  uses: string[];
  sideEffects: string[];
  interactions: string[];
  dosage: string;
  warnings: string[];
  storage: string;
}

const mockDrugDatabase: Record<string, DrugInfo> = {
  "aspirin": {
    name: "Aspirin",
    genericName: "Acetylsalicylic Acid",
    manufacturer: "Multiple Manufacturers",
    category: "Pain Reliever / Anti-inflammatory",
    description: "Aspirin is a nonsteroidal anti-inflammatory drug (NSAID) used to reduce pain, fever, or inflammation.",
    uses: [
      "Relief of mild to moderate pain",
      "Reduction of fever",
      "Prevention of heart attack and stroke in at-risk patients",
      "Treatment of inflammatory conditions"
    ],
    sideEffects: [
      "Upset stomach",
      "Heartburn",
      "Drowsiness",
      "Mild headache",
      "Nausea"
    ],
    interactions: [
      "Blood thinners (warfarin)",
      "Other NSAIDs",
      "Corticosteroids",
      "Alcohol"
    ],
    dosage: "Adults: 325-650 mg every 4-6 hours as needed. Do not exceed 4000 mg in 24 hours.",
    warnings: [
      "Do not give to children under 12 without medical advice",
      "May increase risk of bleeding",
      "Consult doctor if pregnant or breastfeeding",
      "Avoid if you have stomach ulcers"
    ],
    storage: "Store at room temperature away from moisture and heat."
  },
  "amoxicillin": {
    name: "Amoxicillin",
    genericName: "Amoxicillin",
    manufacturer: "Multiple Manufacturers",
    category: "Antibiotic",
    description: "Amoxicillin is a penicillin antibiotic used to treat many different types of bacterial infections.",
    uses: [
      "Treatment of bacterial infections",
      "Ear, nose, and throat infections",
      "Urinary tract infections",
      "Skin infections",
      "Respiratory infections"
    ],
    sideEffects: [
      "Nausea",
      "Vomiting",
      "Diarrhea",
      "Rash",
      "Yeast infection"
    ],
    interactions: [
      "Birth control pills (may reduce effectiveness)",
      "Blood thinners",
      "Allopurinol",
      "Probenecid"
    ],
    dosage: "Adults: 250-500 mg every 8 hours or 500-875 mg every 12 hours. Complete full course as prescribed.",
    warnings: [
      "Allergic reactions can be severe - seek immediate medical help if you experience difficulty breathing",
      "Complete the full prescribed course",
      "May cause antibiotic resistance if misused",
      "Inform doctor if you have kidney disease"
    ],
    storage: "Store tablets at room temperature. Refrigerate liquid suspension and discard after 14 days."
  },
  "metformin": {
    name: "Metformin",
    genericName: "Metformin Hydrochloride",
    manufacturer: "Multiple Manufacturers",
    category: "Antidiabetic",
    description: "Metformin is an oral diabetes medicine that helps control blood sugar levels in type 2 diabetes.",
    uses: [
      "Treatment of type 2 diabetes",
      "Polycystic ovary syndrome (PCOS)",
      "Prevention of diabetes in at-risk patients"
    ],
    sideEffects: [
      "Diarrhea",
      "Nausea",
      "Upset stomach",
      "Metallic taste",
      "Loss of appetite"
    ],
    interactions: [
      "Contrast dye (used in medical imaging)",
      "Alcohol",
      "Insulin",
      "Other diabetes medications"
    ],
    dosage: "Adults: Start with 500 mg twice daily or 850 mg once daily with meals. May increase gradually up to 2000-2550 mg per day.",
    warnings: [
      "Monitor blood sugar regularly",
      "Risk of lactic acidosis (rare but serious)",
      "Stop before surgery or contrast imaging procedures",
      "Not for use in type 1 diabetes"
    ],
    storage: "Store at room temperature away from moisture and heat."
  }
};

export function DrugInfoLookup() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [drugInfo, setDrugInfo] = useState<DrugInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setNotFound(false);
    setDrugInfo(null);

    // Simulate API call
    setTimeout(() => {
      const found = mockDrugDatabase[searchQuery.toLowerCase().trim()];
      if (found) {
        setDrugInfo(found);
      } else {
        setNotFound(true);
      }
      setIsSearching(false);
    }, 800);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drug Information Lookup</CardTitle>
        <CardDescription>
          Search for detailed information about medications, interactions, and safety warnings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Enter drug name (e.g., Aspirin, Amoxicillin, Metformin)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>

        {notFound && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Drug "{searchQuery}" not found in our database. Try searching for generic names like Aspirin, Amoxicillin, or Metformin.
            </AlertDescription>
          </Alert>
        )}

        {drugInfo && (
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold">{drugInfo.name}</h3>
              <p className="text-muted-foreground">Generic: {drugInfo.genericName}</p>
              <div className="flex gap-2 mt-2">
                <Badge>{drugInfo.category}</Badge>
                <Badge variant="outline">{drugInfo.manufacturer}</Badge>
              </div>
            </div>

            <p className="text-sm">{drugInfo.description}</p>

            <Tabs defaultValue="uses" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="uses">Uses</TabsTrigger>
                <TabsTrigger value="dosage">Dosage</TabsTrigger>
                <TabsTrigger value="sideeffects">Side Effects</TabsTrigger>
                <TabsTrigger value="interactions">Interactions</TabsTrigger>
                <TabsTrigger value="warnings">Warnings</TabsTrigger>
              </TabsList>

              <TabsContent value="uses" className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Common Uses
                </h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  {drugInfo.uses.map((use, index) => (
                    <li key={index}>{use}</li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="dosage" className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Recommended Dosage
                </h4>
                <p className="text-sm">{drugInfo.dosage}</p>
                <Alert>
                  <AlertDescription className="text-xs">
                    Always follow your doctor's prescription. Do not adjust dosage without medical advice.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="sideeffects" className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  Possible Side Effects
                </h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  {drugInfo.sideEffects.map((effect, index) => (
                    <li key={index}>{effect}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Contact your doctor if side effects persist or worsen.
                </p>
              </TabsContent>

              <TabsContent value="interactions" className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Drug Interactions
                </h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  {drugInfo.interactions.map((interaction, index) => (
                    <li key={index}>{interaction}</li>
                  ))}
                </ul>
                <Alert>
                  <AlertDescription className="text-xs">
                    Always inform your doctor about all medications you are taking.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="warnings" className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Important Warnings
                </h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  {drugInfo.warnings.map((warning, index) => (
                    <li key={index} className="text-red-600">{warning}</li>
                  ))}
                </ul>
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm"><strong>Storage:</strong> {drugInfo.storage}</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
