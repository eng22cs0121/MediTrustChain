
'use server';
/**
 * @fileOverview Provides AI-generated information about a specific drug.
 *
 * - getDrugInfo - A function that retrieves detailed information about a drug.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const DrugInfoInputSchema = z.object({
  drugName: z.string().describe("The official name of the drug, e.g., 'Paracetamol 500mg'"),
});
export type DrugInfoInput = z.infer<typeof DrugInfoInputSchema>;

const DrugInfoOutputSchema = z.object({
  summary: z.string().describe("A brief, one-paragraph summary of the drug's class and mechanism."),
  primaryUse: z.string().describe("The primary medical use or indication for the drug."),
  keyWarnings: z.string().describe("A list of 2-3 key warnings or important contraindications, formatted as a simple string list."),
  imageDataUri: z.string().optional().describe("A generated image of the drug as a data URI."),
});
export type DrugInfoOutput = z.infer<typeof DrugInfoOutputSchema>;


export async function getDrugInfo(input: DrugInfoInput): Promise<DrugInfoOutput> {
  return drugInfoFlow(input);
}


const infoPrompt = ai.definePrompt({
    name: 'drugInfoPrompt',
    input: { schema: DrugInfoInputSchema },
    output: { schema: DrugInfoOutputSchema.omit({ imageDataUri: true }) },
    prompt: `You are a pharmaceutical expert AI. Your task is to provide concise, accurate information about a given drug for a professional audience (pharmacists, regulators).

    Drug Name: {{{drugName}}}

    Based on the drug name, provide the following information:
    1.  **Summary**: A brief, one-paragraph summary of the drug's class and mechanism of action.
    2.  **Primary Use**: The main clinical indication for the drug.
    3.  **Key Warnings**: 2-3 of the most critical warnings or contraindications. Format this as a simple string, using bullet points (e.g., "- Warning 1\n- Warning 2").

    Ensure the information is professional, accurate, and easy to understand.
    `,
});

const drugInfoFlow = ai.defineFlow(
  {
    name: 'drugInfoFlow',
    inputSchema: DrugInfoInputSchema,
    outputSchema: DrugInfoOutputSchema,
  },
  async (input) => {
    try {
      const { output: infoOutput } = await infoPrompt(input);
      if (!infoOutput) {
          throw new Error("Could not generate drug information.");
      }
      
      try {
          const imagePromptText = `A photorealistic image of a single "${input.drugName}" pill, on a neutral, clean background.`;
          const { media } = await ai.generate({
              model: googleAI.model('imagen-4.0-fast-generate-001'),
              prompt: imagePromptText,
          });

          return {
              ...infoOutput,
              imageDataUri: media?.url
          };
      } catch (e) {
          console.error("Image generation failed, returning text info only.", e);
          // If image generation fails, return the text info without the image.
          return {
              ...infoOutput,
              imageDataUri: undefined,
          };
      }
    } catch (error) {
      console.error("Drug info generation failed:", error);
      // Return fallback data if AI generation fails
      return {
        summary: `${input.drugName} is a pharmaceutical product. Detailed information is currently unavailable.`,
        primaryUse: "Please consult a healthcare professional for accurate information.",
        keyWarnings: "- Consult healthcare provider before use\n- Follow prescribed dosage\n- Check for allergies",
        imageDataUri: undefined,
      };
    }
  }
);
