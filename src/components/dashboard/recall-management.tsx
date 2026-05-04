"use client";

import { useState } from "react";
import { useRecalls } from "@/contexts/recall-context";
import { useBatches } from "@/contexts/batches-context";
import { BatchRecall, RecallClass, RecallAction } from "@/types/recall";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Send, CheckCircle, XCircle, Clock, FileText, Users } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function RecallManagement() {
  const { recalls, initiateRecall, sendRecallNotifications, getRecallStatistics, getRecallNotifications, terminateRecall } = useRecalls();
  const { batches } = useBatches();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRecall, setSelectedRecall] = useState<BatchRecall | null>(null);
  const [terminationNotes, setTerminationNotes] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    batchId: "",
    recallClass: "Class II" as RecallClass,
    reason: "",
    healthHazard: "",
    affectedLotNumbers: "",
    totalUnitsProduced: 0,
    unitsDistributed: 0,
    recommendedAction: "Return" as RecallAction,
    recallStrategy: "Wholesale and Retail",
    distributorsNotified: "",
    pharmaciesNotified: "",
    fdaNotified: false,
    notes: "",
  });

  const stats = getRecallStatistics();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInitiateRecall = () => {
    const batch = batches.find(b => b.id === formData.batchId);
    if (!batch) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Batch not found",
      });
      return;
    }

    const recall = initiateRecall({
      batchId: formData.batchId,
      batchName: batch.name,
      manufacturer: batch.manufacturer || "Unknown",
      recallClass: formData.recallClass,
      recallDate: new Date(),
      reason: formData.reason,
      healthHazard: formData.healthHazard,
      affectedLotNumbers: formData.affectedLotNumbers.split(',').map(s => s.trim()),
      totalUnitsProduced: formData.totalUnitsProduced,
      unitsDistributed: formData.unitsDistributed,
      recommendedAction: formData.recommendedAction,
      recallStrategy: formData.recallStrategy,
      status: 'Initiated',
      fdaNotified: formData.fdaNotified,
      fdaNotificationDate: formData.fdaNotified ? new Date() : undefined,
      distributorsNotified: formData.distributorsNotified.split(',').map(s => s.trim()).filter(s => s),
      pharmaciesNotified: formData.pharmaciesNotified.split(',').map(s => s.trim()).filter(s => s),
      patientsNotified: 0,
      createdBy: "Current User", // TODO: Get from auth context
      notes: formData.notes,
    });

    toast({
      title: "Recall Initiated",
      description: `Recall ${recall.id} has been created for batch ${formData.batchId}`,
    });

    // Reset form
    setFormData({
      batchId: "",
      recallClass: "Class II",
      reason: "",
      healthHazard: "",
      affectedLotNumbers: "",
      totalUnitsProduced: 0,
      unitsDistributed: 0,
      recommendedAction: "Return",
      recallStrategy: "Wholesale and Retail",
      distributorsNotified: "",
      pharmaciesNotified: "",
      fdaNotified: false,
      notes: "",
    });
    setIsDialogOpen(false);
  };

  const handleSendNotifications = async (recallId: string) => {
    const count = await sendRecallNotifications(recallId);
    toast({
      title: "Notifications Sent",
      description: `${count} notifications have been sent to supply chain participants`,
    });
  };

  const handleTerminateRecall = (recallId: string) => {
    if (!terminationNotes.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide termination notes",
      });
      return;
    }

    terminateRecall(recallId, terminationNotes);
    setSelectedRecall(null);
    setTerminationNotes("");
    
    toast({
      title: "Recall Terminated",
      description: "The recall has been successfully terminated",
    });
  };

  const getClassBadgeColor = (recallClass: RecallClass) => {
    switch (recallClass) {
      case 'Class I': return 'destructive';
      case 'Class II': return 'default';
      case 'Class III': return 'secondary';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Initiated': return 'default';
      case 'In Progress': return 'default';
      case 'Completed': return 'secondary';
      case 'Terminated': return 'secondary';
      case 'Ongoing': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recalls</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecalls}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Recalls</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRecalls}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class I Recalls</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.byClass.classI}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageResponseRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Initiate Recall Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="lg">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Initiate New Recall
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Initiate Batch Recall</DialogTitle>
            <DialogDescription>
              Start a product recall process. This will notify all supply chain participants.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Batch Selection */}
            <div className="space-y-2">
              <Label htmlFor="batchId">Batch ID *</Label>
              <Select value={formData.batchId} onValueChange={(value) => handleInputChange('batchId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch to recall" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(batch => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.id} - {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recall Class */}
            <div className="space-y-2">
              <Label htmlFor="recallClass">FDA Recall Classification *</Label>
              <Select value={formData.recallClass} onValueChange={(value) => handleInputChange('recallClass', value as RecallClass)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Class I">Class I - Life-threatening or serious injury</SelectItem>
                  <SelectItem value="Class II">Class II - Temporary or reversible health problems</SelectItem>
                  <SelectItem value="Class III">Class III - Unlikely to cause adverse health effects</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Recall *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                placeholder="e.g., Product contamination, incorrect labeling, dosage error..."
                rows={3}
              />
            </div>

            {/* Health Hazard */}
            <div className="space-y-2">
              <Label htmlFor="healthHazard">Health Hazard Evaluation *</Label>
              <Textarea
                id="healthHazard"
                value={formData.healthHazard}
                onChange={(e) => handleInputChange('healthHazard', e.target.value)}
                placeholder="Describe potential health risks to patients..."
                rows={3}
              />
            </div>

            {/* Affected Lot Numbers */}
            <div className="space-y-2">
              <Label htmlFor="affectedLotNumbers">Affected Lot Numbers (comma-separated)</Label>
              <Input
                id="affectedLotNumbers"
                value={formData.affectedLotNumbers}
                onChange={(e) => handleInputChange('affectedLotNumbers', e.target.value)}
                placeholder="LOT-001, LOT-002, LOT-003"
              />
            </div>

            {/* Units */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalUnitsProduced">Total Units Produced</Label>
                <Input
                  id="totalUnitsProduced"
                  type="number"
                  value={formData.totalUnitsProduced}
                  onChange={(e) => handleInputChange('totalUnitsProduced', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitsDistributed">Units Distributed</Label>
                <Input
                  id="unitsDistributed"
                  type="number"
                  value={formData.unitsDistributed}
                  onChange={(e) => handleInputChange('unitsDistributed', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Recommended Action */}
            <div className="space-y-2">
              <Label htmlFor="recommendedAction">Recommended Action *</Label>
              <Select value={formData.recommendedAction} onValueChange={(value) => handleInputChange('recommendedAction', value as RecallAction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Return">Return to Manufacturer</SelectItem>
                  <SelectItem value="Destroy">Destroy On-Site</SelectItem>
                  <SelectItem value="Quarantine">Quarantine Pending Instructions</SelectItem>
                  <SelectItem value="Correction">Correction Without Removal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recall Strategy */}
            <div className="space-y-2">
              <Label htmlFor="recallStrategy">Recall Strategy</Label>
              <Input
                id="recallStrategy"
                value={formData.recallStrategy}
                onChange={(e) => handleInputChange('recallStrategy', e.target.value)}
                placeholder="e.g., Wholesale and Retail level"
              />
            </div>

            {/* Distributors */}
            <div className="space-y-2">
              <Label htmlFor="distributorsNotified">Distributors to Notify (comma-separated)</Label>
              <Input
                id="distributorsNotified"
                value={formData.distributorsNotified}
                onChange={(e) => handleInputChange('distributorsNotified', e.target.value)}
                placeholder="Global Pharma, MedDist Inc, HealthSupply Co"
              />
            </div>

            {/* Pharmacies */}
            <div className="space-y-2">
              <Label htmlFor="pharmaciesNotified">Pharmacies to Notify (comma-separated)</Label>
              <Input
                id="pharmaciesNotified"
                value={formData.pharmaciesNotified}
                onChange={(e) => handleInputChange('pharmaciesNotified', e.target.value)}
                placeholder="CVS, Walgreens, RiteAid"
              />
            </div>

            {/* FDA Notification */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="fdaNotified"
                checked={formData.fdaNotified}
                onChange={(e) => handleInputChange('fdaNotified', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="fdaNotified">FDA has been notified</Label>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>

            <Button onClick={handleInitiateRecall} className="w-full" variant="destructive">
              Initiate Recall
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Recalls List */}
      <Card>
        <CardHeader>
          <CardTitle>Recall Management</CardTitle>
          <CardDescription>Track and manage product recalls</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">Active Recalls</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="all">All Recalls</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {recalls.filter(r => r.status === 'Initiated' || r.status === 'In Progress' || r.status === 'Ongoing').map(recall => (
                <Card key={recall.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {recall.id}
                          <Badge variant={getClassBadgeColor(recall.recallClass)}>
                            {recall.recallClass}
                          </Badge>
                          <Badge variant={getStatusBadgeColor(recall.status)}>
                            {recall.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Batch: {recall.batchId} - {recall.batchName}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSendNotifications(recall.id)}
                          disabled={recall.notificationsSent > 0}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {recall.notificationsSent > 0 ? 'Sent' : 'Send Notifications'}
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              Terminate
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Terminate Recall</DialogTitle>
                              <DialogDescription>
                                Provide termination notes and complete the recall process.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea
                                value={terminationNotes}
                                onChange={(e) => setTerminationNotes(e.target.value)}
                                placeholder="All units recovered and accounted for..."
                                rows={4}
                              />
                              <Button onClick={() => handleTerminateRecall(recall.id)} className="w-full">
                                Confirm Termination
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Reason:</p>
                      <p className="text-sm text-muted-foreground">{recall.reason}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium">Distributed</p>
                        <p className="text-2xl font-bold">{recall.unitsDistributed.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Recovered</p>
                        <p className="text-2xl font-bold text-green-600">{recall.unitsRecovered.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Outstanding</p>
                        <p className="text-2xl font-bold text-orange-600">{recall.unitsOutstanding.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Response Rate</p>
                        <p className="text-2xl font-bold">{recall.responseRate}%</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {recall.notificationsSent} notified
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        {recall.responsesReceived} responded
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(recall.recallDate, 'MMM d, yyyy')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {recalls.filter(r => r.status === 'Initiated' || r.status === 'In Progress' || r.status === 'Ongoing').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No active recalls</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {recalls.filter(r => r.status === 'Completed' || r.status === 'Terminated').map(recall => (
                <Card key={recall.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {recall.id}
                      <Badge variant="secondary">{recall.status}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Batch: {recall.batchId} - Completed {recall.completedAt && format(recall.completedAt, 'MMM d, yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{recall.reason}</p>
                    <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                      <span>{recall.unitsRecovered} units recovered</span>
                      <span>{recall.responseRate}% response rate</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {recalls.map(recall => (
                <Card key={recall.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {recall.id}
                      <Badge variant={getClassBadgeColor(recall.recallClass)}>{recall.recallClass}</Badge>
                      <Badge variant={getStatusBadgeColor(recall.status)}>{recall.status}</Badge>
                    </CardTitle>
                    <CardDescription>Batch: {recall.batchId}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{recall.reason}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
