/**
 * Simplified Analytics Data Processing Utilities
 * Works with existing Batch structure from batches-context
 */

import { format, differenceInHours, parseISO, subDays } from 'date-fns';
import type { Batch, BatchHistoryEvent, BatchStatus } from '@/contexts/batches-context';
import type {
  BatchMetrics,
  SupplyChainMetrics,
  TimeSeriesData,
  AnalyticsDashboardData,
} from '@/types/analytics';

/**
 * Calculate simplified batch metrics
 */
export function calculateBatchMetrics(batches: Batch[]): BatchMetrics {
  const now = new Date();

  const activeBatches = batches.filter(
    b => !['Delivered', 'Blocked'].includes(b.status)
  );

  const completedBatches = batches.filter(
    b => b.status === 'Delivered'
  );

  // Calculate expiring batches (within 30 days)
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringBatches = batches.filter(b => {
    try {
      const expiryDate = new Date(b.exp);
      return expiryDate <= thirtyDaysFromNow && expiryDate >= now;
    } catch {
      return false;
    }
  });

  // Calculate verification rate (Approved status)
  const verifiedBatches = batches.filter(b => b.status === 'Approved');
  const verificationRate = batches.length > 0
    ? (verifiedBatches.length / batches.length) * 100
    : 0;

  // Calculate recall rate (Blocked status)
  const recalledBatches = batches.filter(b => b.status === 'Blocked');
  const recallRate = batches.length > 0
    ? (recalledBatches.length / batches.length) * 100
    : 0;

  // Calculate average transit time
  const transitTimes = completedBatches
    .map(batch => {
      const firstEvent = batch.history?.[0];
      const lastEvent = batch.history?.[batch.history.length - 1];
      if (!firstEvent || !lastEvent) return null;
      return differenceInHours(parseISO(lastEvent.timestamp), parseISO(firstEvent.timestamp));
    })
    .filter((time): time is number => time !== null);

  const averageTransitTime = transitTimes.length > 0
    ? transitTimes.reduce((a, b) => a + b, 0) / transitTimes.length
    : 0;

  // Count tampering incidents (Flagged status)
  const tamperingIncidents = batches.filter(b => b.status === 'Flagged').length;

  return {
    totalBatches: batches.length,
    activeBatches: activeBatches.length,
    completedBatches: completedBatches.length,
    averageTransitTime: Math.round(averageTransitTime),
    verificationRate: Math.round(verificationRate * 10) / 10,
    recallRate: Math.round(recallRate * 10) / 10,
    expiringWithin30Days: expiringBatches.length,
    tamperingIncidents,
  };
}

/**
 * Calculate supply chain metrics
 */
export function calculateSupplyChainMetrics(batches: Batch[]): SupplyChainMetrics {
  const manufacturers = new Set(batches.map(b => b.manufacturer).filter(Boolean));

  const distributors = new Set(
    batches.flatMap(b =>
      b.history?.filter((h: BatchHistoryEvent) => h.location?.toLowerCase().includes('distributor'))
        .map((h: BatchHistoryEvent) => h.location) || []
    )
  );

  const pharmacies = new Set(
    batches.flatMap(b =>
      b.history?.filter((h: BatchHistoryEvent) => h.location?.toLowerCase().includes('pharmacy'))
        .map((h: BatchHistoryEvent) => h.location) || []
    )
  );

  const totalTransactions = batches.reduce((sum, b) => sum + (b.history?.length || 0), 0);

  // Calculate average delivery time
  const deliveryTimes = batches
    .filter(b => b.status === 'Delivered')
    .map(batch => {
      const firstEvent = batch.history?.[0];
      const lastEvent = batch.history?.[batch.history.length - 1];
      if (!firstEvent || !lastEvent) return null;
      return differenceInHours(parseISO(lastEvent.timestamp), parseISO(firstEvent.timestamp));
    })
    .filter((time): time is number => time !== null);

  const averageDeliveryTime = deliveryTimes.length > 0
    ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
    : 0;

  // Calculate on-time delivery rate (assuming 72 hours is target)
  const onTimeDeliveries = deliveryTimes.filter(time => time <= 72).length;
  const onTimeDeliveryRate = deliveryTimes.length > 0
    ? (onTimeDeliveries / deliveryTimes.length) * 100
    : 0;

  return {
    manufacturerCount: manufacturers.size,
    distributorCount: distributors.size,
    pharmacyCount: pharmacies.size,
    totalTransactions,
    averageDeliveryTime: Math.round(averageDeliveryTime),
    onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 10) / 10,
    inventoryTurnover: 0, // Simplified
    bottleneckLocations: [],
  };
}

/**
 * Generate time series data
 */
export function generateTimeSeriesData(batches: Batch[], days: number = 30): TimeSeriesData[] {
  const timeSeriesMap: Record<string, TimeSeriesData> = {};
  const startDate = subDays(new Date(), days);

  // Initialize all dates
  for (let i = 0; i <= days; i++) {
    const date = format(subDays(new Date(), days - i), 'yyyy-MM-dd');
    timeSeriesMap[date] = {
      date,
      manufactured: 0,
      distributed: 0,
      dispensed: 0,
      verified: 0,
      recalls: 0,
    };
  }

  batches.forEach(batch => {
    batch.history?.forEach((event: BatchHistoryEvent) => {
      const eventDate = parseISO(event.timestamp);
      if (eventDate < startDate) return;

      const dateKey = format(eventDate, 'yyyy-MM-dd');
      if (!timeSeriesMap[dateKey]) return;

      if (event.status === 'Pending') {
        timeSeriesMap[dateKey].manufactured++;
      } else if (event.status === 'In-Transit') {
        timeSeriesMap[dateKey].distributed++;
      } else if (event.status === 'Delivered') {
        timeSeriesMap[dateKey].dispensed++;
      } else if (event.status === 'Approved') {
        timeSeriesMap[dateKey].verified++;
      } else if (event.status === 'Blocked') {
        timeSeriesMap[dateKey].recalls!++;
      }
    });
  });

  return Object.values(timeSeriesMap).sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Main function to generate dashboard data
 */
export function generateAnalyticsDashboardData(batches: Batch[]): AnalyticsDashboardData {
  return {
    batchMetrics: calculateBatchMetrics(batches),
    supplyChainMetrics: calculateSupplyChainMetrics(batches),
    drugCategoryMetrics: [], // Simplified - not available in current schema
    timeSeriesData: generateTimeSeriesData(batches, 30),
    geographicData: [], // Simplified
    demandForecasts: [], // Simplified
    anomalies: [], // Simplified
    performanceMetrics: [], // Simplified
    supplyChainGraph: { nodes: [], edges: [] },
    complianceMetrics: {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      complianceRate: 0,
      criticalViolations: 0,
      pendingReviews: 0,
      averageResolutionTime: 0,
    },
    revenueMetrics: {
      totalRevenue: 0,
      revenueByCategory: {},
      revenueByRegion: {},
      averageOrderValue: 0,
      growthRate: 0,
      projectedRevenue: 0,
    },
    inventoryMetrics: {
      totalUnits: batches.reduce((sum, b) => sum + b.qty, 0),
      unitsInTransit: batches.filter(b => b.status === 'In-Transit').reduce((sum, b) => sum + b.qty, 0),
      unitsAtDistributors: 0, // Simplified
      unitsAtPharmacies: 0, // Simplified
      stockoutRisk: 0,
      overstockItems: [],
      expiringStock: 0,
    },
    lastUpdated: new Date().toISOString(),
  };
}
