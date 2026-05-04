"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBatches, type Batch } from "@/contexts/batches-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function PrintQRPage() {
  const { id } = useParams();
  const { batches } = useBatches();
  const router = useRouter();
  const [batch, setBatch] = useState<Batch | null>(null);

  useEffect(() => {
    if (id && batches.length > 0) {
      const found = batches.find(b => b.id === id);
      setBatch(found || null);
    }
  }, [id, batches]);

  if (!batch) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading batch details...</p>
      </div>
    );
  }

  const getQrCodeValue = (batch: Batch) => {
    const { id, name, mfg, exp, qty, manufacturer, dataHash } = batch;
    const mfgTimestamp = Math.floor(new Date(mfg).getTime() / 1000);
    const expTimestamp = Math.floor(new Date(exp).getTime() / 1000);

    return JSON.stringify({
      batchCode: id,
      drugName: name,
      quantity: qty,
      mfgDate: mfgTimestamp,
      expDate: expTimestamp,
      manufacturer: manufacturer || undefined,
      dataHash: dataHash || undefined,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ProtectedRoute allowedTypes={["manufacturer"]}>
      <div className="min-h-screen bg-white text-black print:p-0 p-8">
        <div className="print:hidden mb-8 flex justify-between max-w-2xl mx-auto">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print QR Code
          </Button>
        </div>

        <div className="max-w-2xl mx-auto border-2 border-black p-8 rounded-xl print:border-none print:p-0">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">MediTrustChain</h1>
            <p className="text-gray-600">Verified Pharmaceutical Batch</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-12">
            <div className="p-4 bg-white border rounded-xl shadow-sm">
              <QRCodeSVG value={getQrCodeValue(batch)} size={256} />
            </div>

            <div className="space-y-4 text-left">
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Batch ID</p>
                <p className="text-xl font-mono">{batch.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Drug Name</p>
                <p className="text-xl">{batch.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Manufacturer</p>
                <p className="text-lg">{batch.manufacturer}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Mfg Date</p>
                  <p>{batch.mfg}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Exp Date</p>
                  <p>{batch.exp}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Quantity</p>
                <p>{batch.qty.toLocaleString()} Units</p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center text-sm text-gray-500 border-t pt-4">
            <p>Scan this QR code using the MediTrustChain mobile app to verify authenticity and track supply chain history.</p>
            {batch.dataHash && (
              <p className="mt-2 text-xs font-mono break-all text-gray-400">
                Data Hash: {batch.dataHash}
              </p>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
