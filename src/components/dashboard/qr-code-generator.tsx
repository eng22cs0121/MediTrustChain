"use client";

import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface QRCodeGeneratorProps {
  batchId: string;
  drugName: string;
  manufacturer: string;
  mfgDate: string;
  expDate: string;
}

export function QRCodeGenerator({ batchId, drugName, manufacturer, mfgDate, expDate }: QRCodeGeneratorProps) {
  const qrData = JSON.stringify({
    batchId,
    drugName,
    manufacturer,
    mfgDate,
    expDate,
    verifyUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${batchId}`
  });

  const handleDownload = () => {
    const svg = document.getElementById(`qr-${batchId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-${batchId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch QR Code</CardTitle>
        <CardDescription>Scan this code to verify drug authenticity</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="p-4 bg-white rounded-lg">
          <QRCodeSVG
            id={`qr-${batchId}`}
            value={qrData}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>
        <div className="text-center space-y-1">
          <p className="font-semibold">{drugName}</p>
          <p className="text-sm text-muted-foreground">Batch ID: {batchId}</p>
        </div>
        <Button onClick={handleDownload} variant="outline" className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Download QR Code
        </Button>
      </CardContent>
    </Card>
  );
}
