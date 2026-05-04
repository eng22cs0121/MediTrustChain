/**
 * AI Anomaly Detection Service
 * 
 * Enhanced service that:
 * 1. Runs AI anomaly detection on batch data
 * 2. Stores results in database (not affecting blockchain)
 * 3. Provides risk scores for regulator review
 * 
 * ARCHITECTURE:
 * - AI output stored in database
 * - Approval still happens on-chain only
 * - Never modifies batch hash
 */

import { createServerClient } from '../supabase/server';
import { checkForAnomalies, analyzeBatchesForAnomalies } from '@/ai/flows/anomaly-detection-flow';
import type { AnomalyDetectionOutput, BatchAnalysisOutput, BatchData } from '@/ai/flows/anomaly-detection-types';

// Anomaly result stored in database
export interface StoredAnomalyResult {
    id: string;
    batch_id: string;
    risk_score: number;
    is_anomaly: boolean;
    anomaly_types: string[];
    reasons: string[];
    analysis_notes: string;
    analyzed_at: string;
    analyzed_by: 'AI' | 'REGULATOR';
}

/**
 * AI Anomaly Detection Service
 */
export class AnomalyDetectionService {

    /**
     * Analyze single batch for anomalies and store result
     */
    async analyzeBatch(batchData: BatchData): Promise<AnomalyDetectionOutput & { storedId?: string }> {
        console.log(`🔍 AI analyzing batch ${batchData.id}...`);

        // Run AI analysis
        const result = await checkForAnomalies({
            batch: batchData,
            currentDate: new Date().toISOString(),
        });

        // Store result in database
        let storedId: string | undefined;
        try {
            storedId = await this.storeAnomalyResult(batchData.id, result);
            console.log(`   ✓ Analysis stored with ID ${storedId}`);
        } catch (error) {
            console.error('   ✗ Failed to store analysis:', error);
        }

        return { ...result, storedId };
    }

    /**
     * Analyze multiple batches for anomalies
     */
    async analyzeMultipleBatches(batches: BatchData[]): Promise<BatchAnalysisOutput & { storedIds?: string[] }> {
        console.log(`🔍 AI analyzing ${batches.length} batches...`);

        // Run AI analysis
        const result = await analyzeBatchesForAnomalies(batches);

        // Store results for each batch that has anomalies
        const storedIds: string[] = [];
        for (const anomaly of result.anomalies) {
            try {
                const storedId = await this.storeIndividualAnomaly(anomaly);
                if (storedId) storedIds.push(storedId);
            } catch (error) {
                console.error(`   ✗ Failed to store anomaly for ${anomaly.batchId}:`, error);
            }
        }

        console.log(`   ✓ Stored ${storedIds.length} anomaly records`);
        return { ...result, storedIds };
    }

    /**
     * Store anomaly result in database
     */
    private async storeAnomalyResult(batchId: string, result: AnomalyDetectionOutput): Promise<string> {
        const supabase = await createServerClient();

        const { data, error } = await supabase
            .from('anomaly_results')
            .insert({
                batch_id: batchId,
                risk_score: result.overallRiskScore,
                is_anomaly: result.isAnomaly,
                anomaly_types: result.anomalies.map(a => a.type),
                reasons: result.anomalies.map(a => a.description),
                analysis_notes: result.analysisNotes,
                analyzed_at: new Date().toISOString(),
                analyzed_by: 'AI',
            })
            .select('id')
            .single();

        if (error) throw error;
        return data?.id || '';
    }

    /**
     * Store individual anomaly record
     */
    private async storeIndividualAnomaly(anomaly: {
        id: string;
        batchId: string;
        type: string;
        severity: string;
        title: string;
        description: string;
        recommendation: string;
        confidence: number;
        detectedAt: string;
        affectedStage: string;
    }): Promise<string | null> {
        const supabase = await createServerClient();

        const { data, error } = await supabase
            .from('anomaly_results')
            .insert({
                batch_id: anomaly.batchId,
                risk_score: anomaly.confidence,
                is_anomaly: true,
                anomaly_types: [anomaly.type],
                reasons: [anomaly.description],
                severity: anomaly.severity,
                analysis_notes: `AI detected ${anomaly.type} anomaly`,
                analyzed_at: new Date().toISOString(),
                analyzed_by: 'AI',
            })
            .select('id')
            .single();

        if (error) {
            console.error('Store anomaly error:', error);
            return null;
        }
        return data?.id || null;
    }

    /**
     * Get stored anomaly results for a batch
     */
    async getAnomalyResults(batchId: string): Promise<StoredAnomalyResult[]> {
        const supabase = await createServerClient();

        const { data, error } = await supabase
            .from('anomaly_results')
            .select('*')
            .eq('batch_id', batchId)
            .order('analyzed_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch anomaly results:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Get all pending batches with high risk scores
     */
    async getHighRiskBatches(minRiskScore: number = 70): Promise<StoredAnomalyResult[]> {
        const supabase = await createServerClient();

        const { data, error } = await supabase
            .from('anomaly_results')
            .select('*')
            .gte('risk_score', minRiskScore)
            .eq('is_anomaly', true)
            .order('risk_score', { ascending: false });

        if (error) {
            console.error('Failed to fetch high risk batches:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Mark anomaly as reviewed by regulator
     */
    async markAsReviewed(anomalyId: string, reviewedBy: string, notes?: string): Promise<void> {
        const supabase = await createServerClient();

        await supabase
            .from('anomaly_results')
            .update({
                reviewed_by: reviewedBy,
                reviewed_at: new Date().toISOString(),
                review_notes: notes,
            })
            .eq('id', anomalyId);
    }
}

// Export singleton
export const anomalyService = new AnomalyDetectionService();
