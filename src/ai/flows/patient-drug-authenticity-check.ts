
'use server';
/**
 * @fileOverview This file defines a flow for patients to check the authenticity of a drug using a QR code scan.
 *
 * - patientDrugAuthenticityCheck - The function to initiate the drug authenticity check.
 */

import {z} from 'zod';

const PatientDrugAuthenticityCheckInputSchema = z.object({
  qrCodeData: z
    .string()
    .describe('The data extracted from the QR code on the medicine package.'),
  batches: z.array(z.any()).optional().describe('Array of batches from the system'),
});

const PatientDrugAuthenticityCheckOutputSchema = z.object({
  status: z
    .enum(['Genuine', 'Fake', 'Expired'])
    .describe('The authenticity and expiry status of the drug.'),
  details: z
    .string()
    .optional()
    .describe('Additional details about the drug authenticity check.'),
});

export async function patientDrugAuthenticityCheck(
  input: z.infer<typeof PatientDrugAuthenticityCheckInputSchema>
): Promise<z.infer<typeof PatientDrugAuthenticityCheckOutputSchema>> {
  try {
    // Parse the QR code data
    const qrData = JSON.parse(input.qrCodeData);
    const { batchId, drugName, mfgDate, expDate, manufacturer } = qrData;

    if (!batchId) {
      return {
        status: 'Fake',
        details: 'Invalid QR code: Missing batch ID. This may be a counterfeit product.',
      };
    }

    // Find the batch in the system
    const batch = input.batches?.find(b => b.id === batchId);

    // Check if batch exists in the system
    if (!batch) {
      return {
        status: 'Fake',
        details: `Batch ${batchId} not found in our blockchain system. This product is likely counterfeit.`,
      };
    }

    // Check if batch is approved by regulators
    if (batch.status === 'Pending') {
      return {
        status: 'Fake',
        details: `Batch ${batchId} is pending regulatory approval and should not be in circulation yet. Do not use this product.`,
      };
    }

    if (batch.status === 'Blocked' || batch.status === 'Rejected') {
      return {
        status: 'Fake',
        details: `Batch ${batchId} has been ${batch.status.toLowerCase()} by regulators. This product should not be used.`,
      };
    }

    // Check if batch has been delivered to a pharmacy
    const hasBeenDelivered = batch.history?.some((event: any) => event.status === 'Delivered');
    if (!hasBeenDelivered) {
      return {
        status: 'Fake',
        details: `Batch ${batchId} has not been delivered to any authorized pharmacy yet. This product may be stolen or counterfeit.`,
      };
    }

    // Check expiry date
    const expiryDate = new Date(batch.exp || expDate);
    const today = new Date();
    
    if (expiryDate < today) {
      return {
        status: 'Expired',
        details: `This medicine expired on ${expiryDate.toLocaleDateString()}. Do not use expired medication.`,
      };
    }

    // All checks passed - product is genuine
    return {
      status: 'Genuine',
      details: `The drug ${batch.name} (Batch ${batchId}) from ${batch.manufacturer} is genuine and not expired. Expiry date: ${expiryDate.toLocaleDateString()}. This batch has been verified through our blockchain supply chain.`,
    };

  } catch (error) {
    console.error('Error checking drug authenticity:', error);
    return {
      status: 'Fake',
      details: 'Unable to verify this QR code. It may be damaged or counterfeit.',
    };
  }
}
