"use client";

import { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, QrCode, Palette, Settings, Share2, FileImage } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeData, QRCodeOptions } from "@/types/preferences";

interface EnhancedQRCodeGeneratorProps {
  batchId: string;
  drugName: string;
  manufacturer: string;
  manufacturingDate: string;
  expiryDate: string;
  blockchainHash?: string;
}

export function EnhancedQRCodeGenerator({
  batchId,
  drugName,
  manufacturer,
  manufacturingDate,
  expiryDate,
  blockchainHash,
}: EnhancedQRCodeGeneratorProps) {
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  const [options, setOptions] = useState<QRCodeOptions>({
    size: 300,
    includeMargin: true,
    foregroundColor: "#000000",
    backgroundColor: "#FFFFFF",
    errorCorrectionLevel: "M",
    format: "png",
  });

  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/verify/${batchId}`;

  const qrData: QRCodeData = {
    batchId,
    drugName,
    manufacturer,
    manufacturingDate,
    expiryDate,
    verificationUrl,
    blockchainHash,
  };

  const qrValue = JSON.stringify(qrData);

  const updateOption = <K extends keyof QRCodeOptions>(key: K, value: QRCodeOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const downloadQRCode = (format: 'png' | 'svg' | 'jpeg') => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) {
      toast({
        title: "Error",
        description: "QR code not found",
        variant: "destructive",
      });
      return;
    }

    if (format === 'svg') {
      // For SVG, we'd need a different approach
      toast({
        title: "SVG Export",
        description: "SVG export coming soon",
      });
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qr-code-${batchId}.${format}`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "QR Code Downloaded",
        description: `QR code saved as ${format.toUpperCase()}`,
      });
    }, `image/${format}`);
  };

  const copyToClipboard = async () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        toast({
          title: "Copied!",
          description: "QR code copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy QR code",
          variant: "destructive",
        });
      }
    });
  };

  const shareQRCode = async () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `qr-code-${batchId}.png`, { type: 'image/png' });

      if (navigator.share) {
        try {
          await navigator.share({
            title: `QR Code - ${drugName}`,
            text: `Batch ${batchId} - ${drugName}`,
            files: [file],
          });
          toast({
            title: "Shared!",
            description: "QR code shared successfully",
          });
        } catch (error) {
          // User cancelled or error occurred
        }
      } else {
        toast({
          title: "Not Supported",
          description: "Sharing is not supported on this device",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            Enhanced QR Code Generator
          </h2>
          <p className="text-muted-foreground">Customize and download QR codes for your batches</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle>QR Code Preview</CardTitle>
            <CardDescription>Live preview of your customized QR code</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div
              ref={qrRef}
              className="p-6 rounded-lg"
              style={{ backgroundColor: options.backgroundColor }}
            >
              <QRCodeCanvas
                value={qrValue}
                size={options.size}
                level={options.errorCorrectionLevel}
                includeMargin={options.includeMargin}
                fgColor={options.foregroundColor}
                bgColor={options.backgroundColor}
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={() => downloadQRCode('png')}>
                <Download className="h-4 w-4 mr-2" />
                Download PNG
              </Button>
              <Button variant="outline" onClick={() => downloadQRCode('jpeg')}>
                <FileImage className="h-4 w-4 mr-2" />
                Download JPEG
              </Button>
              <Button variant="outline" onClick={copyToClipboard}>
                Copy
              </Button>
              <Button variant="outline" onClick={shareQRCode}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            <div className="w-full p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Batch Information</p>
              <div className="space-y-1 text-xs">
                <p><span className="font-medium">Batch ID:</span> {batchId}</p>
                <p><span className="font-medium">Drug:</span> {drugName}</p>
                <p><span className="font-medium">Manufacturer:</span> {manufacturer}</p>
                <p><span className="font-medium">Mfg Date:</span> {manufacturingDate}</p>
                <p><span className="font-medium">Expiry:</span> {expiryDate}</p>
                {blockchainHash && (
                  <p className="truncate">
                    <span className="font-medium">Hash:</span> {blockchainHash.slice(0, 20)}...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customization Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Customization Options</CardTitle>
            <CardDescription>Adjust QR code appearance and properties</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">
                  <Settings className="h-4 w-4 mr-2" />
                  Basic
                </TabsTrigger>
                <TabsTrigger value="colors">
                  <Palette className="h-4 w-4 mr-2" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="advanced">
                  Advanced
                </TabsTrigger>
              </TabsList>

              {/* Basic Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="size">Size: {options.size}px</Label>
                  <Slider
                    id="size"
                    min={100}
                    max={600}
                    step={50}
                    value={[options.size]}
                    onValueChange={([value]) => updateOption('size', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="error-correction">Error Correction Level</Label>
                  <Select
                    value={options.errorCorrectionLevel}
                    onValueChange={(value: any) => updateOption('errorCorrectionLevel', value)}
                  >
                    <SelectTrigger id="error-correction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Low (7%)</SelectItem>
                      <SelectItem value="M">Medium (15%)</SelectItem>
                      <SelectItem value="Q">Quartile (25%)</SelectItem>
                      <SelectItem value="H">High (30%)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Higher levels allow QR code to work even if partially damaged
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="margin">Include Margin</Label>
                    <p className="text-xs text-muted-foreground">
                      Add quiet zone around QR code
                    </p>
                  </div>
                  <Switch
                    id="margin"
                    checked={options.includeMargin}
                    onCheckedChange={(checked) => updateOption('includeMargin', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="format">Export Format</Label>
                  <Select
                    value={options.format}
                    onValueChange={(value: any) => updateOption('format', value)}
                  >
                    <SelectTrigger id="format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG (Recommended)</SelectItem>
                      <SelectItem value="jpeg">JPEG</SelectItem>
                      <SelectItem value="svg">SVG (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Colors Tab */}
              <TabsContent value="colors" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="fg-color">Foreground Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="fg-color"
                      type="color"
                      value={options.foregroundColor}
                      onChange={(e) => updateOption('foregroundColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={options.foregroundColor}
                      onChange={(e) => updateOption('foregroundColor', e.target.value)}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Color of the QR code pattern
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bg-color">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bg-color"
                      type="color"
                      value={options.backgroundColor}
                      onChange={(e) => updateOption('backgroundColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={options.backgroundColor}
                      onChange={(e) => updateOption('backgroundColor', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Background color behind the QR code
                  </p>
                </div>

                <div className="pt-4 space-y-2">
                  <Label>Color Presets</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateOption('foregroundColor', '#000000');
                        updateOption('backgroundColor', '#FFFFFF');
                      }}
                    >
                      Default
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateOption('foregroundColor', '#1E40AF');
                        updateOption('backgroundColor', '#EFF6FF');
                      }}
                    >
                      Blue
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateOption('foregroundColor', '#DC2626');
                        updateOption('backgroundColor', '#FEF2F2');
                      }}
                    >
                      Red
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateOption('foregroundColor', '#059669');
                        updateOption('backgroundColor', '#F0FDF4');
                      }}
                    >
                      Green
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateOption('foregroundColor', '#7C3AED');
                        updateOption('backgroundColor', '#FAF5FF');
                      }}
                    >
                      Purple
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateOption('foregroundColor', '#FFFFFF');
                        updateOption('backgroundColor', '#000000');
                      }}
                    >
                      Dark
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Advanced Tab */}
              <TabsContent value="advanced" className="space-y-4 mt-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium">QR Code Data</p>
                  <pre className="text-xs overflow-auto max-h-40 p-2 bg-background rounded">
                    {JSON.stringify(qrData, null, 2)}
                  </pre>
                </div>

                <div className="space-y-2">
                  <Label>Verification URL</Label>
                  <div className="flex gap-2">
                    <Input value={verificationUrl} readOnly className="text-xs" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(verificationUrl);
                        toast({
                          title: "Copied!",
                          description: "URL copied to clipboard",
                        });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-sm font-medium mb-2">Features Coming Soon:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Custom logo/image overlay</li>
                    <li>Gradient colors</li>
                    <li>Rounded corners and dots</li>
                    <li>SVG export with custom styling</li>
                    <li>Bulk QR code generation</li>
                    <li>Print-ready templates</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
