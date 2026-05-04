'use server';
/**
 * @fileOverview AI-powered chatbot flow for MediTrustChain assistant
 * Provides intelligent responses about supply chain, batches, and system features
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatbotInputSchema = z.object({
  userMessage: z.string().describe('The user\'s question or query'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('Previous conversation messages for context'),
  userRole: z.string().optional().describe('The user\'s role (manufacturer, pharmacy, etc.)'),
});

const ChatbotOutputSchema = z.object({
  response: z.string().describe('The AI assistant\'s response to the user'),
});

const chatbotPrompt = ai.definePrompt({
  name: 'mediTrustChainChatbot',
  input: { schema: ChatbotInputSchema },
  output: { schema: ChatbotOutputSchema },
  prompt: `You are an intelligent AI assistant for MediTrustChain, a blockchain-powered pharmaceutical supply chain security platform.

## Your Role
You help users understand and navigate the MediTrustChain system. You provide accurate, helpful information about:
- Drug batch tracking and verification
- Supply chain workflows
- Blockchain security features
- Role-specific dashboard features
- Compliance and regulatory information
- Anomaly detection and alerts
- Authentication and verification processes

## User Context
{{#if userRole}}
Current User Role: {{userRole}}
{{/if}}

## Conversation History
{{#if conversationHistory}}
{{#each conversationHistory}}
{{role}}: {{content}}
{{/each}}
{{/if}}

## Current Question
User: {{userMessage}}

## Response Guidelines
1. **Be Concise**: Keep responses under 200 words unless detailed explanation is needed
2. **Be Accurate**: Only provide information about features that exist in MediTrustChain
3. **Be Helpful**: Offer specific steps or navigation paths when relevant
4. **Be Professional**: Maintain a friendly but professional tone
5. **Be Action-Oriented**: Guide users to relevant dashboards or features

## Key System Features to Reference
- **Batch Tracking**: Complete journey from manufacturer to patient
- **QR Code Verification**: Scan to verify drug authenticity
- **Blockchain Security**: Immutable, transparent records
- **Multi-Role Support**: Manufacturer, Distributor, Logistics, Pharmacy, Regulator, Patient
- **AI Anomaly Detection**: Automatic flagging of suspicious patterns
- **Real-Time Notifications**: Status updates and alerts
- **Analytics Dashboard**: Supply chain insights and metrics
- **Voice Commands**: Navigate using voice (e.g., "go to dashboard")

## Important URLs
- Patient Verification: /verify (no login required)
- Stakeholder Login: /login
- Analytics: /dashboard/analytics
- About: /about

Provide your response now:`,
});

const chatbotFlow = ai.defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: ChatbotInputSchema,
    outputSchema: ChatbotOutputSchema,
  },
  async (input) => {
    const { output } = await chatbotPrompt(input);
    return output!;
  }
);

export async function getChatbotResponse(
  userMessage: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  userRole?: string
): Promise<string> {
  try {
    const result = await chatbotFlow({
      userMessage,
      conversationHistory,
      userRole,
    });
    return result.response;
  } catch (error) {
    console.error('Chatbot AI error:', error);
    return "I'm having trouble processing your request right now. Please try rephrasing your question or contact support if the issue persists.";
  }
}
