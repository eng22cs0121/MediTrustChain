
'use server';
/**
 * @fileOverview Provides AI-powered analytics for the dashboard.
 *
 * - getAnalyticsSummary - A function that generates a summary of batch data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { type Batch } from '@/contexts/batches-context';


const AnalyticsInputSchema = z.object({
  batches: z.array(z.custom<Batch>()),
  role: z.enum(["manufacturer", "regulator"])
});


const AnalyticsOutputSchema = z.object({
  summary: z.string().describe("A concise, insightful summary of the provided data."),
  keyMetrics: z.array(z.object({
    name: z.string().describe("The name of the metric."),
    value: z.string().describe("The value of the metric."),
  })).describe("A list of key performance indicators."),
  predictions: z.array(z.object({
    title: z.string().describe("A short title for the prediction."),
    description: z.string().describe("A 1-2 sentence description of the potential bottleneck or issue."),
    severity: z.enum(["Low", "Medium", "High"]).describe("The severity of the potential issue."),
  })).describe("A list of predictive insights about potential future bottlenecks."),
});


export async function getAnalyticsSummary(input: z.infer<typeof AnalyticsInputSchema>): Promise<z.infer<typeof AnalyticsOutputSchema>> {
  return analyticsFlow(input);
}


const prompt = ai.definePrompt({
    name: 'analyticsPrompt',
    input: { schema: AnalyticsInputSchema },
    output: { schema: AnalyticsOutputSchema },
    prompt: `You are an expert supply chain data analyst for a pharmaceutical company. Your task is to provide a high-level summary, key metrics, and predictive insights based on the provided batch data for a user with the role: {{{role}}}.

    Current Date: ${new Date().toDateString()}

    Analyze the following batch data, paying close attention to timestamps, locations, and status changes in the history:
    \`\`\`json
    {{{json batches}}}
    \`\`\`

    1.  **Summary**: Generate a 1-2 sentence summary of the most important trends.
    2.  **Key Metrics**: Provide 3-4 key metrics that would be most relevant to the user's role. For a 'manufacturer', focus on production, approval rates, and efficiency. For a 'regulator', focus on compliance, pending items, and flagged anomalies.
    3.  **Predictions**: Based on historical data, identify 1-2 potential future bottlenecks or risks. For example, if a certain distribution hub is consistently slow, predict a future delay. If a type of drug is frequently flagged, predict future compliance issues. For each prediction, provide a title, a short description, and a severity level (Low, Medium, High).
    `,
});

const analyticsFlow = ai.defineFlow(
  {
    name: 'analyticsFlow',
    inputSchema: AnalyticsInputSchema,
    outputSchema: AnalyticsOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      return output!;
    } catch (error) {
      console.error('AI analytics API failed:', error);
      // Fallback to static analytics
      const batches = input.batches || [];
      const totalBatches = batches.length;
      const approved = batches.filter(b => b.status === 'Approved').length;
      const pending = batches.filter(b => b.status === 'Pending').length;
      const flagged = batches.filter(b => b.anomalyReason).length;
      return {
        summary: `Showing static analytics. There are ${totalBatches} batches in the system. ${approved} approved, ${pending} pending, ${flagged} flagged for review.`,
        keyMetrics: [
          { name: 'Total Batches', value: String(totalBatches) },
          { name: 'Approved', value: String(approved) },
          { name: 'Pending', value: String(pending) },
          { name: 'Flagged', value: String(flagged) },
        ],
        predictions: [
          {
            title: 'Manual Review Required',
            description: 'Some batches are flagged for anomalies. Please review them for compliance.',
            severity: flagged > 0 ? 'High' as const : 'Low' as const,
          },
        ],
      };
    }
  }
);
