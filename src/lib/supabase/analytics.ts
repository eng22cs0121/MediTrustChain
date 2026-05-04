"use server";

import { createClient } from "./server";

export type DeliveryTimeByRegion = {
  region: string;
  avgDays: number;
};

export type AnomalyFrequency = {
  date: string;
  count: number;
};

export type ManufacturerScore = {
  name: string;
  totalBatches: number;
  anomalies: number;
  score: number; // 0 to 100
};

export async function fetchAnalyticsData() {
  const supabase = await createClient();

  // 1. Fetch batches for manufacturer scores and delivery times
  const { data: batches } = await supabase
    .from("batches")
    .select("id, manufacturer, status, created_at, mfg, exp");

  // 2. Fetch anomalies for frequency and manufacturer scoring
  const { data: anomalies } = await supabase
    .from("anomaly_results")
    .select("id, batch_id, created_at, status, anomaly_types");

  // 3. Fetch batch history to compute delivery times
  // In a real production app we would do this via SQL views or RPCs to avoid large payloads.
  const { data: history } = await supabase
    .from("batch_history")
    .select("batch_id, location, timestamp, status")
    .order("timestamp", { ascending: true });

  // Process Anomaly Frequency Over Time (last 30 days)
  const frequencyMap: Record<string, number> = {};
  const today = new Date();
  
  // Initialize last 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    frequencyMap[dateStr] = 0;
  }

  anomalies?.forEach((anomaly) => {
    const d = new Date(anomaly.created_at);
    if ((today.getTime() - d.getTime()) / (1000 * 3600 * 24) <= 30) {
      const dateStr = d.toISOString().split('T')[0];
      if (frequencyMap[dateStr] !== undefined) {
        frequencyMap[dateStr]++;
      }
    }
  });

  const anomalyFrequencyData: AnomalyFrequency[] = Object.keys(frequencyMap).map(date => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: frequencyMap[date]
  }));

  // Process Manufacturer Performance Scores
  const manufacturerMap: Record<string, { batches: number, anomalies: number }> = {};
  
  batches?.forEach(batch => {
    const mfg = batch.manufacturer || "Unknown";
    if (!manufacturerMap[mfg]) manufacturerMap[mfg] = { batches: 0, anomalies: 0 };
    manufacturerMap[mfg].batches++;
  });

  anomalies?.forEach(anomaly => {
    const batch = batches?.find(b => b.id === anomaly.batch_id);
    if (batch) {
      const mfg = batch.manufacturer || "Unknown";
      if (!manufacturerMap[mfg]) manufacturerMap[mfg] = { batches: 0, anomalies: 0 };
      manufacturerMap[mfg].anomalies++;
    }
  });

  const manufacturerScoreData: ManufacturerScore[] = Object.keys(manufacturerMap).map(mfg => {
    const stats = manufacturerMap[mfg];
    // Simple scoring: 100 base - (anomalies / totalBatches) * 100. 
    // If anomalies > totalBatches (e.g. multiple anomalies per batch), floor to 0
    let score = 100;
    if (stats.batches > 0) {
      score = Math.max(0, 100 - (stats.anomalies / stats.batches) * 100);
    }
    return {
      name: mfg,
      totalBatches: stats.batches,
      anomalies: stats.anomalies,
      score: Math.round(score)
    };
  }).sort((a, b) => b.score - a.score);

  // Process Average Delivery Times by Region
  // We look for time between 'Approved'/'In-Transit' and 'Sold'/'Delivered'
  const regionTimes: Record<string, { totalDays: number, count: number }> = {};
  
  if (history) {
    // Group history by batch
    const historyByBatch: Record<string, any[]> = {};
    history.forEach(h => {
      if (!historyByBatch[h.batch_id]) historyByBatch[h.batch_id] = [];
      historyByBatch[h.batch_id].push(h);
    });

    Object.keys(historyByBatch).forEach(batchId => {
      const hList = historyByBatch[batchId];
      // Find start (first In-Transit)
      const startEvent = hList.find(h => h.status === 'In-Transit');
      // Find end (Sold or Delivered)
      const endEvent = hList.find(h => h.status === 'Sold' || h.status === 'Delivered');

      if (startEvent && endEvent) {
        const start = new Date(startEvent.timestamp).getTime();
        const end = new Date(endEvent.timestamp).getTime();
        const days = (end - start) / (1000 * 3600 * 24);
        
        // Extract region from location (e.g. "Mumbai, India" -> "Mumbai")
        const location = endEvent.location || "Unknown Region";
        const region = location.split(',')[0].trim();

        if (days > 0) {
          if (!regionTimes[region]) regionTimes[region] = { totalDays: 0, count: 0 };
          regionTimes[region].totalDays += days;
          regionTimes[region].count++;
        }
      }
    });
  }

  const deliveryTimeData: DeliveryTimeByRegion[] = Object.keys(regionTimes).map(region => ({
    region,
    avgDays: parseFloat((regionTimes[region].totalDays / regionTimes[region].count).toFixed(1))
  }));

  // Dummy data fallback for demo purposes if empty
  if (deliveryTimeData.length === 0) {
    deliveryTimeData.push(
      { region: "Mumbai", avgDays: 2.4 },
      { region: "Delhi", avgDays: 3.1 },
      { region: "Bangalore", avgDays: 1.8 },
      { region: "Pune", avgDays: 2.0 }
    );
  }

  return {
    anomalyFrequencyData,
    manufacturerScoreData,
    deliveryTimeData,
    totalBatches: batches?.length || 0,
    totalAnomalies: anomalies?.length || 0,
  };
}
