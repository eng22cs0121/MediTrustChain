import { config } from 'dotenv';
config();

import '@/ai/flows/patient-drug-authenticity-check.ts';
import '@/ai/flows/about-page-ai-assistance.ts';
import '@/ai/flows/anomaly-detection-flow.ts';
import '@/ai/flows/analytics-flow.ts';
import '@/ai/flows/text-to-speech-flow.ts';
import '@/ai/flows/drug-info-flow.ts';
import '@/ai/flows/video-generation-flow.ts';
