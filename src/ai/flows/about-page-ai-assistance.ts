
'use server';

/**
 * @fileOverview An AI-powered assistant for the About/Help page.
 *
 * - getAboutPageAssistance - A function that provides AI assistance for the About/Help page.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { type OrganizationType } from '@/contexts/cbac-auth-context';
import { textToSpeech } from './text-to-speech-flow';

const GetAboutPageAssistanceInputSchema = z.object({
  query: z.string().describe('The user query about the project or how to verify medicines.'),
  organizationType: z.custom<OrganizationType>().optional().describe("The user's organization type."),
});

const GetAboutPageAssistanceOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the user query.'),
  audioDataUri: z.string().optional().describe('The AI-generated audio for the answer as a data URI.'),
});

export async function getAboutPageAssistance(input: z.infer<typeof GetAboutPageAssistanceInputSchema>): Promise<z.infer<typeof GetAboutPageAssistanceOutputSchema>> {
  return aboutPageAssistanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aboutPageAssistancePrompt',
  input: {schema: GetAboutPageAssistanceInputSchema},
  output: {schema: z.object({ answer: z.string() })},
  prompt: `You are an AI assistant for MediTrustChain, a blockchain-based pharmaceutical supply chain tracking system.

## Your Task
Provide clear, well-structured answers about MediTrustChain's features, usage, and capabilities.

## Formatting Guidelines
- Use **bold** for important terms and headings
- Use bullet points (- or *) for lists
- Use numbered lists for step-by-step instructions
- Keep paragraphs short and scannable
- Add line breaks between sections for readability

## MediTrustChain Context
- **Purpose**: Blockchain-based pharmaceutical supply chain tracking
- **Key Features**: Drug authentication, batch tracking, supply chain transparency, tamper-proof records
- **Organization Types**: Manufacturer, Distributor, Logistics, Pharmacy, Patient, Regulator
- **Technology**: Ethereum blockchain (Sepolia testnet), QR codes, AI anomaly detection

{{#if organizationType}}
User Organization Type: **{{organizationType}}**
Tailor your answer to their organization type. Example:
- Manufacturers: Can create batches, generate QR codes
- Patients: Can verify drug authenticity via QR scan
- Regulators: Can view audit trails and compliance data
{{else}}
User is exploring the platform.
{{/if}}

## User Query
{{query}}

## Response Format
Structure your answer with:
1. A brief introductory sentence
2. Key points in bullet format or sections with **headings**
3. Specific examples when relevant
4. A concluding sentence if appropriate

CRITICAL: Respond ONLY with valid JSON:
{"answer": "your well-formatted markdown answer here"}

Do NOT include any text outside the JSON object.
Do NOT use template variables like {{organizationType}} in your output.
`,
});

const aboutPageAssistanceFlow = ai.defineFlow(
  {
    name: 'aboutPageAssistanceFlow',
    inputSchema: GetAboutPageAssistanceInputSchema,
    outputSchema: GetAboutPageAssistanceOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      
      // Check if we got a valid answer
      if (!output?.answer || typeof output.answer !== 'string') {
        return { answer: "I'm sorry, I couldn't generate a response." };
      }
      
      // Try to get TTS audio (optional)
      let audioDataUri: string | undefined;
      try {
        const ttsResponse = await textToSpeech(output.answer);
        audioDataUri = ttsResponse.media;
      } catch {
        // TTS is optional, continue without audio
      }

      return {
        answer: output.answer,
        audioDataUri
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle JSON parsing errors from Groq
      if (errorMessage.includes('JSON5') || errorMessage.includes('invalid character')) {
        return { 
          answer: "⚠️ **AI Response Error**\n\nThe AI service returned an unexpected format. This is a known issue with Groq. Please try:\n\n1. Asking your question differently\n2. Using simpler questions\n3. Waiting a moment and trying again" 
        };
      }
      
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('quota')) {
        return { 
          answer: "⚠️ **Rate Limit Reached**\n\nThe AI service is temporarily unavailable due to high usage. Please wait a minute and try again.\n\nIn the meantime, you can explore the app manually or check the documentation." 
        };
      }
      
      // Rate limit can also cause fetch to fail
      if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNRESET')) {
        return { 
          answer: "⚠️ **AI Service Unavailable**\n\nThe AI service couldn't be reached. This is usually due to:\n\n- **Rate limiting** - Too many requests. Wait 1-2 minutes.\n- **Network issues** - Check your internet connection.\n\nPlease try again shortly." 
        };
      }
      
      console.error('About page AI error:', error);
      return { answer: "I'm sorry, I couldn't generate a response. Please try again later." };
    }
  }
);
