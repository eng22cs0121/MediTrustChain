
'use server';
/**
 * @fileOverview A flow for generating a video summary of a batch's journey.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { type Batch } from '@/contexts/batches-context';
import { googleAI } from '@genkit-ai/googleai';
import * as fs from 'fs';
import { Readable } from 'stream';

const VideoGenerationInputSchema = z.object({
  batch: z.custom<Batch>(),
});

const VideoGenerationOutputSchema = z.object({
  videoDataUri: z.string().describe('The generated video as a data URI.'),
});

export async function generateVideoSummary(
  input: z.infer<typeof VideoGenerationInputSchema>
): Promise<z.infer<typeof VideoGenerationOutputSchema>> {
  return videoGenerationFlow(input);
}

function generatePromptFromBatch(batch: Batch): string {
    let journeyDescription = `The journey of drug batch ${batch.id} (${batch.name}), manufactured by ${batch.manufacturer}. `;
    journeyDescription += `It was created on ${batch.mfg}. `;

    const journeyPoints = batch.history.map(event => 
        `Then, it was marked as '${event.status}' at '${event.location}' on ${new Date(event.timestamp).toLocaleDateString()}`
    ).join('. ');

    journeyDescription += journeyPoints + ".";

    return `Create a cinematic, corporate-style video visualizing a supply chain journey. Show a map of the United States with animated lines connecting locations. The video should represent the following journey: ${journeyDescription}. Use on-screen text to highlight key locations and status changes. The video should have an optimistic and professional tone, showing efficiency and security.`;
}

const videoGenerationFlow = ai.defineFlow(
  {
    name: 'videoGenerationFlow',
    inputSchema: VideoGenerationInputSchema,
    outputSchema: VideoGenerationOutputSchema,
  },
  async ({ batch }) => {
    const prompt = generatePromptFromBatch(batch);
    
    let { operation } = await ai.generate({
      model: googleAI.model('veo-2.0-generate-001'),
      prompt,
      config: {
        durationSeconds: 8,
        aspectRatio: '16:9',
      },
    });

    if (!operation) {
      throw new Error('Expected the model to return an operation');
    }

    // Wait for the operation to complete
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      operation = await ai.checkOperation(operation);
    }

    if (operation.error) {
      throw new Error('Failed to generate video: ' + operation.error.message);
    }

    const video = operation.output?.message?.content.find((p) => !!p.media);
    if (!video || !video.media?.url) {
      throw new Error('Failed to find the generated video');
    }

    // Since we are in a serverless environment, we can't save to a file system.
    // We need to fetch the video data and convert it to a data URI to send to the client.
    // This assumes the `video.media.url` is a temporary download link.
    const fetch = (await import('node-fetch')).default;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    
    const videoDownloadResponse = await fetch(`${video.media.url}&key=${apiKey}`);

    if (!videoDownloadResponse.ok || !videoDownloadResponse.body) {
      throw new Error(`Failed to fetch video: ${videoDownloadResponse.statusText}`);
    }

    const videoBuffer = await videoDownloadResponse.buffer();
    const videoBase64 = videoBuffer.toString('base64');
    const contentType = video.media.contentType || 'video/mp4';

    return {
      videoDataUri: `data:${contentType};base64,${videoBase64}`,
    };
  }
);
