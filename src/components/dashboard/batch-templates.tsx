"use client";

import { useState } from "react";
import { usePreferences } from "@/contexts/preferences-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileText, Plus, Trash2, Edit, Copy, Save, X, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { BatchTemplate } from "@/types/preferences";

export function BatchTemplatesManager() {
  const { batchTemplates, createTemplate, updateTemplate, deleteTemplate, useTemplate } = usePreferences();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BatchTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    drugName: '',
    drugCategory: '',
    dosageForm: '',
    strength: '',
    unitSize: '',
    storageConditions: '',
    handlingInstructions: '',
    shelfLife: '',
    manufacturer: '',
    manufacturingLocation: '',
    defaultQuantity: '',
    tags: '',
    category: '',
    isPublic: false,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      drugName: '',
      drugCategory: '',
      dosageForm: '',
      strength: '',
      unitSize: '',
      storageConditions: '',
      handlingInstructions: '',
      shelfLife: '',
      manufacturer: '',
      manufacturingLocation: '',
      defaultQuantity: '',
      tags: '',
      category: '',
      isPublic: false,
    });
  };

  const handleCreateTemplate = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    createTemplate({
      name: formData.name,
      description: formData.description || undefined,
      templateData: {
        drugName: formData.drugName || undefined,
        drugCategory: formData.drugCategory || undefined,
        dosageForm: formData.dosageForm || undefined,
        strength: formData.strength || undefined,
        unitSize: formData.unitSize || undefined,
        storageConditions: formData.storageConditions || undefined,
        handlingInstructions: formData.handlingInstructions || undefined,
        shelfLife: formData.shelfLife ? parseInt(formData.shelfLife) : undefined,
        manufacturer: formData.manufacturer || undefined,
        manufacturingLocation: formData.manufacturingLocation || undefined,
        defaultQuantity: formData.defaultQuantity ? parseInt(formData.defaultQuantity) : undefined,
      },
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : undefined,
      category: formData.category || undefined,
      isPublic: formData.isPublic,
      createdBy: 'current-user', // Replace with actual user ID
    });

    toast({
      title: "Template created",
      description: `Template "${formData.name}" has been created successfully.`,
    });

    resetForm();
    setIsCreateDialogOpen(false);
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate) return;

    updateTemplate(selectedTemplate.id, {
      name: formData.name,
      description: formData.description || undefined,
      templateData: {
        ...selectedTemplate.templateData,
        drugName: formData.drugName || undefined,
        drugCategory: formData.drugCategory || undefined,
        dosageForm: formData.dosageForm || undefined,
        strength: formData.strength || undefined,
        unitSize: formData.unitSize || undefined,
        storageConditions: formData.storageConditions || undefined,
        handlingInstructions: formData.handlingInstructions || undefined,
        shelfLife: formData.shelfLife ? parseInt(formData.shelfLife) : undefined,
        manufacturer: formData.manufacturer || undefined,
        manufacturingLocation: formData.manufacturingLocation || undefined,
        defaultQuantity: formData.defaultQuantity ? parseInt(formData.defaultQuantity) : undefined,
      },
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : undefined,
      category: formData.category || undefined,
      isPublic: formData.isPublic,
    });

    toast({
      title: "Template updated",
      description: `Template "${formData.name}" has been updated.`,
    });

    resetForm();
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    deleteTemplate(id);
    toast({
      title: "Template deleted",
      description: `Template "${name}" has been deleted.`,
    });
  };

  const handleDuplicateTemplate = (template: BatchTemplate) => {
    createTemplate({
      ...template,
      name: `${template.name} (Copy)`,
      createdBy: 'current-user',
    });

    toast({
      title: "Template duplicated",
      description: `Template "${template.name}" has been duplicated.`,
    });
  };

  const handleUseTemplate = (id: string, name: string) => {
    const template = useTemplate(id);
    if (template) {
      toast({
        title: "Template loaded",
        description: `Template "${name}" data has been loaded. Create a new batch to use it.`,
      });
      // In a real implementation, this would populate the batch creation form
    }
  };

  const openEditDialog = (template: BatchTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      drugName: template.templateData.drugName || '',
      drugCategory: template.templateData.drugCategory || '',
      dosageForm: template.templateData.dosageForm || '',
      strength: template.templateData.strength || '',
      unitSize: template.templateData.unitSize || '',
      storageConditions: template.templateData.storageConditions || '',
      handlingInstructions: template.templateData.handlingInstructions || '',
      shelfLife: template.templateData.shelfLife?.toString() || '',
      manufacturer: template.templateData.manufacturer || '',
      manufacturingLocation: template.templateData.manufacturingLocation || '',
      defaultQuantity: template.templateData.defaultQuantity?.toString() || '',
      tags: template.tags?.join(', ') || '',
      category: template.category || '',
      isPublic: template.isPublic,
    });
    setIsEditDialogOpen(true);
  };

  const TemplateForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Template Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Standard Paracetamol"
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this template"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="drugName">Drug Name</Label>
          <Input
            id="drugName"
            value={formData.drugName}
            onChange={(e) => setFormData({ ...formData, drugName: e.target.value })}
            placeholder="e.g., Paracetamol"
          />
        </div>

        <div>
          <Label htmlFor="drugCategory">Drug Category</Label>
          <Select value={formData.drugCategory} onValueChange={(val) => setFormData({ ...formData, drugCategory: val })}>
            <SelectTrigger id="drugCategory">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Analgesic">Analgesic</SelectItem>
              <SelectItem value="Antibiotic">Antibiotic</SelectItem>
              <SelectItem value="Antiviral">Antiviral</SelectItem>
              <SelectItem value="Antifungal">Antifungal</SelectItem>
              <SelectItem value="Vaccine">Vaccine</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="dosageForm">Dosage Form</Label>
          <Select value={formData.dosageForm} onValueChange={(val) => setFormData({ ...formData, dosageForm: val })}>
            <SelectTrigger id="dosageForm">
              <SelectValue placeholder="Select form" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tablet">Tablet</SelectItem>
              <SelectItem value="Capsule">Capsule</SelectItem>
              <SelectItem value="Syrup">Syrup</SelectItem>
              <SelectItem value="Injection">Injection</SelectItem>
              <SelectItem value="Cream">Cream</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="strength">Strength</Label>
          <Input
            id="strength"
            value={formData.strength}
            onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
            placeholder="e.g., 500mg"
          />
        </div>

        <div>
          <Label htmlFor="unitSize">Unit Size</Label>
          <Input
            id="unitSize"
            value={formData.unitSize}
            onChange={(e) => setFormData({ ...formData, unitSize: e.target.value })}
            placeholder="e.g., 10 tablets/strip"
          />
        </div>

        <div>
          <Label htmlFor="shelfLife">Shelf Life (months)</Label>
          <Input
            id="shelfLife"
            type="number"
            value={formData.shelfLife}
            onChange={(e) => setFormData({ ...formData, shelfLife: e.target.value })}
            placeholder="e.g., 24"
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="storageConditions">Storage Conditions</Label>
          <Textarea
            id="storageConditions"
            value={formData.storageConditions}
            onChange={(e) => setFormData({ ...formData, storageConditions: e.target.value })}
            placeholder="e.g., Store below 25°C in a dry place"
            rows={2}
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="handlingInstructions">Handling Instructions</Label>
          <Textarea
            id="handlingInstructions"
            value={formData.handlingInstructions}
            onChange={(e) => setFormData({ ...formData, handlingInstructions: e.target.value })}
            placeholder="Special handling requirements"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input
            id="manufacturer"
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            placeholder="Manufacturer name"
          />
        </div>

        <div>
          <Label htmlFor="manufacturingLocation">Manufacturing Location</Label>
          <Input
            id="manufacturingLocation"
            value={formData.manufacturingLocation}
            onChange={(e) => setFormData({ ...formData, manufacturingLocation: e.target.value })}
            placeholder="City, Country"
          />
        </div>

        <div>
          <Label htmlFor="defaultQuantity">Default Quantity</Label>
          <Input
            id="defaultQuantity"
            type="number"
            value={formData.defaultQuantity}
            onChange={(e) => setFormData({ ...formData, defaultQuantity: e.target.value })}
            placeholder="e.g., 10000"
          />
        </div>

        <div>
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="e.g., painkiller, otc"
          />
        </div>

        <div className="col-span-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
            />
            <Label htmlFor="isPublic">Make this template public (visible to others in your organization)</Label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Batch Templates</h2>
          <p className="text-muted-foreground">Save batch configurations for quick reuse</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Batch Template</DialogTitle>
              <DialogDescription>
                Create a reusable template for common batch configurations
              </DialogDescription>
            </DialogHeader>
            <TemplateForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                <Save className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {batchTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first batch template to speed up batch creation
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batchTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      {template.isPublic && (
                        <Badge variant="outline">Public</Badge>
                      )}
                    </CardTitle>
                    {template.description && (
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {template.templateData.drugName && (
                  <div>
                    <p className="text-sm font-medium">Drug: {template.templateData.drugName}</p>
                    {template.templateData.strength && (
                      <p className="text-xs text-muted-foreground">{template.templateData.strength}</p>
                    )}
                  </div>
                )}

                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Used {template.usageCount} times</span>
                  {template.lastUsed && (
                    <span>Last: {format(template.lastUsed, 'MMM d')}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleUseTemplate(template.id, template.name)}
                  >
                    <Star className="h-3 w-3 mr-1" />
                    Use
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(template)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicateTemplate(template)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTemplate(template.id, template.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update template configuration
            </DialogDescription>
          </DialogHeader>
          <TemplateForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setSelectedTemplate(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
