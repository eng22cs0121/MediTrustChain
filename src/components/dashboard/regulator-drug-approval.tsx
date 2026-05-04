"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Server, Link as LinkIcon, ExternalLink } from "lucide-react";
import { useBlockchain, useContract, SUPPORTED_CHAINS, DEFAULT_CHAIN } from "@/lib/blockchain";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DrugMaster } from "@/types/drug-master";

export function RegulatorDrugApproval() {
  const { toast } = useToast();
  const [drugs, setDrugs] = useState<DrugMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingDrugId, setPendingDrugId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    drug_name: "",
    generic_name: "",
    drug_code: "",
    composition: "",
    strength: "",
    dosage_form: "",
    approved_expiry_months: 24,
  });

  // Blockchain Hooks
  const { wallet } = useBlockchain();
  const { approveDrugTemplate } = useContract();
  const chainConfig = SUPPORTED_CHAINS[DEFAULT_CHAIN];

  const fetchDrugs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/drug-master');
      if (!res.ok) throw new Error('Failed to fetch drug templates');
      const data = await res.json();
      setDrugs(data.drugs || []);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Could not load drug templates." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrugs();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'approved_expiry_months' ? parseInt(value) || 0 : value }));
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate drug code format: must be DRG- followed by alphanumeric (e.g. DRG-001, DRG-PARA500)
      const drugCodePattern = /^DRG-[A-Z0-9]{2,}$/;
      if (!drugCodePattern.test(formData.drug_code.toUpperCase())) {
        throw new Error('Drug Code must follow the format DRG-XXX (e.g. DRG-001, DRG-PARA500). Only uppercase letters and digits after DRG-.');
      }

      // 1. Submit to API to compute hash and save to DB
      const res = await fetch('/api/drug-master/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create drug template');

      const newDrug = data.drug_master;
      setPendingDrugId(newDrug.id);

      // 2. Execute Blockchain Transaction
      if (wallet.isConnected && approveDrugTemplate) {
        toast({ title: "Transaction Pending", description: "Please confirm the transaction in your wallet." });
        const txResult = await approveDrugTemplate(
          newDrug.drug_code,
          newDrug.drug_name,
          newDrug.composition,
          newDrug.strength
        );

        if (txResult.success && txResult.hash) {
          // 3. Patch the DB with the Blockchain exact transaction hash
          await fetch(`/api/drug-master/${newDrug.id}/blockchain`, {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ blockchain_tx_hash: txResult.hash }),
          });
          toast({ title: "Success", description: "Drug template approved and secured on blockchain!" });
        } else {
          toast({ variant: "destructive", title: "Blockchain Error", description: txResult.error || "Transaction failed." });
        }
      } else {
        toast({ title: "Partial Success", description: "Saved to database, but blockchain recording was skipped or unavailable." });
      }

      setIsDialogOpen(false);
      setFormData({
        drug_name: "", generic_name: "", drug_code: "", composition: "", strength: "", dosage_form: "", approved_expiry_months: 24,
      });
      fetchDrugs();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
      setPendingDrugId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold tracking-tight">Regulator Drug Master List</h2>
           <p className="text-muted-foreground">Manage and approve official pharmaceutical composition templates.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add New Template</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Drug Template</DialogTitle>
              <DialogDescription>
                Lock an official drug composition. This action will be recorded on the blockchain.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTemplate} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="drug_code">Unique Drug Code *</Label>
                  <Input id="drug_code" name="drug_code" value={formData.drug_code} onChange={handleInputChange} required placeholder="e.g., DRG-001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drug_name">Official Drug Name *</Label>
                  <Input id="drug_name" name="drug_name" value={formData.drug_name} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="generic_name">Generic Name</Label>
                  <Input id="generic_name" name="generic_name" value={formData.generic_name} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strength">Strength / Dosage *</Label>
                  <Input id="strength" name="strength" value={formData.strength} onChange={handleInputChange} required placeholder="e.g., 500mg" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="composition">Official Composition (APIs & Excipients) *</Label>
                <Textarea 
                  id="composition" 
                  name="composition" 
                  value={formData.composition} 
                  onChange={handleInputChange} 
                  required 
                  rows={4}
                  placeholder="List all active and inactive ingredients exactly as approved."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                  <Label htmlFor="dosage_form">Dosage Form</Label>
                  <Input id="dosage_form" name="dosage_form" value={formData.dosage_form} onChange={handleInputChange} placeholder="Tablet, Syrup, etc." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approved_expiry_months">Max Expiry (Months) *</Label>
                  <Input type="number" id="approved_expiry_months" name="approved_expiry_months" value={formData.approved_expiry_months} onChange={handleInputChange} required min={1} />
                </div>
              </div>

              {!wallet.isConnected && (
                <Alert variant="destructive" className="mt-4">
                   <AlertTitle>Wallet Not Connected</AlertTitle>
                   <AlertDescription>Connect your regulator wallet to write this template to the blockchain.</AlertDescription>
                </Alert>
              )}

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || !wallet.isConnected}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Approve & Lock Template"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Drug Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : drugs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">No drug templates found. Create one to get started.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Security Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drugs.map(drug => (
                  <TableRow key={drug.id}>
                    <TableCell className="font-mono font-medium">{drug.drug_code}</TableCell>
                    <TableCell>
                      <div>{drug.drug_name}</div>
                      <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate" title={drug.composition}>{drug.composition}</div>
                    </TableCell>
                    <TableCell>{drug.strength}</TableCell>
                    <TableCell>
                      {drug.blockchain_tx_hash ? (
                        <Badge className="bg-success text-success-foreground hover:bg-success/90">On-Chain Locked</Badge>
                      ) : (
                        <Badge variant="secondary">DB Only</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1">
                          <code className="text-xs bg-muted px-1 py-0.5 rounded truncate max-w-[150px]" title={drug.composition_hash}>
                            {drug.composition_hash.slice(0, 10)}...{drug.composition_hash.slice(-8)}
                          </code>
                          {drug.blockchain_tx_hash && (
                             <a 
                                href={`${chainConfig.blockExplorer}/tx/${drug.blockchain_tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline flex items-center"
                             >
                               <ExternalLink className="h-3 w-3 mr-1" /> View Tx
                             </a>
                          )}
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
