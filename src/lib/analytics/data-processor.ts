/**
 * Analytics Data Processing Utilities
 * Processes batch and supply chain data for dashboard visualization
 */

import { format, differenceInHours, parseISO, subDays, isWithinInterval, startOfDay } from 'date-fns';
import type { Batch, BatchHistoryEvent } from '@/contexts/batches-context';
import type {
  BatchMetrics,
  SupplyChainMetrics,
  DrugCategoryMetrics,
  TimeSeriesData,
  GeographicData,
  DemandForecast,
  AnomalyDetection,
  PerformanceMetrics,
  SupplyChainGraph,
  ComplianceMetrics,
  InventoryMetrics,
  AnalyticsDashboardData,
} from '@/types/analytics';

/**
 * Field mapping adapters to work with existing Batch structure
 */
const getBatchDrugName = (batch: Batch) => batch.name;
const getBatchQuantity = (batch: Batch) => batch.qty;
const getBatchExpiryDate = (batch: Batch) => batch.exp;
const getBatchManufacturingDate = (batch: Batch) => batch.mfg;
const getBatchDrugCategory = (batch: Batch) => 'General Pharmaceutical'; // Default category

/**
 * Calculate comprehensive batch metrics
 */
export function calculateBatchMetrics(batches: Batch[]): BatchMetrics {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const activeBatches = batches.filter(
    b => !['Dispensed', 'Delivered', 'Recalled'].includes(b.status)
  );

  const completedBatches = batches.filter(
    b => ['Dispensed', 'Delivered'].includes(b.status)
  );

  const expiringBatches = batches.filter(b => {
    const expDate = getBatchExpiryDate(b);
    if (!expDate) return false;
    const expiryDate = new Date(expDate);
    return expiryDate <= thirtyDaysFromNow && expiryDate >= now;
  });

  const verifiedBatches = batches.filter(b => b.history?.some((h: BatchHistoryEvent) => h.status === 'Approved'));
  const verificationRate = batches.length > 0
    ? (verifiedBatches.length / batches.length) * 100
    : 0;

  const recalledBatches = batches.filter(b => b.status === 'Blocked');
  const recallRate = batches.length > 0
    ? (recalledBatches.length / batches.length) * 100
    : 0;

  // Calculate average transit time (time between manufactured and delivered)
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

  const tamperingIncidents = batches.filter(
    b => b.history?.some((h: BatchHistoryEvent) => h.status === 'Flagged')
  ).length;

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
  const distributors = new Set(batches.flatMap(b =>
    b.history?.filter((h: BatchHistoryEvent) => h.location?.includes('Distributor')).map((h: BatchHistoryEvent) => h.location) || []
  ));
  const pharmacies = new Set(batches.flatMap(b =>
    b.history?.filter((h: BatchHistoryEvent) => h.location?.includes('Pharmacy')).map((h: BatchHistoryEvent) => h.location) || []
  ));

  const totalTransactions = batches.reduce((sum, b) => sum + (b.history?.length || 0), 0);

  // Calculate delivery times for completed batches
  const deliveryTimes = batches
    .filter(b => ['Dispensed', 'Delivered'].includes(b.status))
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

  // Inventory turnover (simplified)
  const completedInLast30Days = batches.filter(b => {
    const lastEvent = b.history?.[b.history.length - 1];
    if (!lastEvent) return false;
    const eventDate = parseISO(lastEvent.timestamp);
    return differenceInHours(new Date(), eventDate) <= 30 * 24;
  }).length;
  const inventoryTurnover = batches.length > 0
    ? (completedInLast30Days / batches.length) * 12 // Annualized
    : 0;

  // Identify bottleneck locations (locations with longest average processing time)
  const locationTimes: Record<string, number[]> = {};
  batches.forEach(batch => {
    batch.history?.forEach((event: BatchHistoryEvent, index: number) => {
      if (index === 0 || !event.location) return;
      const prevEvent = batch.history![index - 1];
      const processingTime = differenceInHours(
        parseISO(event.timestamp),
        parseISO(prevEvent.timestamp)
      );
      if (!locationTimes[event.location]) {
        locationTimes[event.location] = [];
      }
      locationTimes[event.location].push(processingTime);
    });
  });

  const bottleneckLocations = Object.entries(locationTimes)
    .map(([location, times]) => ({
      location,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    }))
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 3)
    .map(item => item.location);

  return {
    manufacturerCount: manufacturers.size,
    distributorCount: distributors.size,
    pharmacyCount: pharmacies.size,
    totalTransactions,
    averageDeliveryTime: Math.round(averageDeliveryTime),
    onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 10) / 10,
    inventoryTurnover: Math.round(inventoryTurnover * 10) / 10,
    bottleneckLocations,
  };
}

/**
 * Calculate drug category metrics
 */
export function calculateDrugCategoryMetrics(batches: Batch[]): DrugCategoryMetrics[] {
  const categoryMap: Record<string, { count: number; recent: number }> = {};

  const thirtyDaysAgo = subDays(new Date(), 30);
  const sixtyDaysAgo = subDays(new Date(), 60);

  batches.forEach(batch => {
    const category = getBatchDrugCategory(batch);
    if (!categoryMap[category]) {
      categoryMap[category] = { count: 0, recent: 0 };
    }
    categoryMap[category].count++;

    // Count recent batches for growth calculation
    const firstEvent = batch.history?.[0];
    if (firstEvent) {
      const eventDate = parseISO(firstEvent.timestamp);
      if (eventDate >= thirtyDaysAgo) {
        categoryMap[category].recent++;
      }
    }
  });

  return Object.entries(categoryMap)
    .map(([category, data]) => {
      // Calculate growth rate (comparing last 30 days to previous 30 days)
      const recentBatches = batches.filter(b => {
        const firstEvent = b.history?.[0];
        if (!firstEvent) return false;
        const eventDate = parseISO(firstEvent.timestamp);
        return getBatchDrugCategory(b) === category &&
          eventDate >= thirtyDaysAgo;
      }).length;

      const previousBatches = batches.filter(b => {
        const firstEvent = b.history?.[0];
        if (!firstEvent) return false;
        const eventDate = parseISO(firstEvent.timestamp);
        return getBatchDrugCategory(b) === category &&
          eventDate >= sixtyDaysAgo &&
          eventDate < thirtyDaysAgo;
      }).length;

      const growthRate = previousBatches > 0
        ? ((recentBatches - previousBatches) / previousBatches) * 100
        : 0;

      return {
        category,
        totalBatches: data.count,
        value: data.count,
        popularityScore: Math.round((data.count / batches.length) * 100),
        growthRate: Math.round(growthRate * 10) / 10,
      };
    })
    .sort((a, b) => b.totalBatches - a.totalBatches);
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
    batch.history?.forEach(event => {
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
 * Generate geographic distribution data
 */
export function generateGeographicData(batches: Batch[]): GeographicData[] {
  const locationMap: Record<string, GeographicData> = {};

  batches.forEach(batch => {
    batch.history?.forEach((event: BatchHistoryEvent) => {
      if (!event.location) return;

      if (!locationMap[event.location]) {
        locationMap[event.location] = {
          location: event.location,
          batches: 0,
          verifications: 0,
          incidents: 0,
        };
      }

      locationMap[event.location].batches++;

      if (event.status === 'Approved') {
        locationMap[event.location].verifications++;
      } else if (event.status === 'Flagged' || event.status === 'Blocked') {
        locationMap[event.location].incidents++;
      }
    });
  });

  return Object.values(locationMap)
    .sort((a, b) => b.batches - a.batches)
    .slice(0, 20); // Top 20 locations
}

/**
 * Generate demand forecasts using simple trend analysis
 */
export function generateDemandForecasts(batches: Batch[]): DemandForecast[] {
  const drugMap: Record<string, { recent: number; previous: number; category: string }> = {};

  const thirtyDaysAgo = subDays(new Date(), 30);
  const sixtyDaysAgo = subDays(new Date(), 60);

  batches.forEach(batch => {
    const drugName = getBatchDrugName(batch);
    if (!drugName) return;

    if (!drugMap[drugName]) {
      drugMap[drugName] = {
        recent: 0,
        previous: 0,
        category: getBatchDrugCategory(batch),
      };
    }

    const firstEvent = batch.history?.[0];
    if (!firstEvent) return;

    const eventDate = parseISO(firstEvent.timestamp);
    if (eventDate >= thirtyDaysAgo) {
      drugMap[drugName].recent++;
    } else if (eventDate >= sixtyDaysAgo) {
      drugMap[drugName].previous++;
    }
  });

  return Object.entries(drugMap)
    .map(([drugName, data]) => {
      const growthRate = data.previous > 0
        ? ((data.recent - data.previous) / data.previous) * 100
        : 0;

      const predictedDemand = Math.round(data.recent * (1 + growthRate / 100));

      let trend: 'increasing' | 'decreasing' | 'stable';
      if (growthRate > 5) trend = 'increasing';
      else if (growthRate < -5) trend = 'decreasing';
      else trend = 'stable';

      // Confidence based on data volume
      const totalData = data.recent + data.previous;
      const confidence = Math.min(95, 50 + totalData * 2);

      return {
        drugName,
        drugCategory: data.category,
        currentDemand: data.recent,
        predictedDemand,
        growthRate: Math.round(growthRate * 10) / 10,
        confidence: Math.round(confidence),
        trend,
      };
    })
    .filter(forecast => forecast.currentDemand > 0)
    .sort((a, b) => Math.abs(b.growthRate) - Math.abs(a.growthRate))
    .slice(0, 10); // Top 10 forecasts
}

/**
 * Detect anomalies in batch data
 */
export function detectAnomalies(batches: Batch[]): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];
  const now = new Date();

  // Calculate average transit times per status for comparison
  const avgTransitTimes: Record<string, number> = {};
  const transitTimeSamples: Record<string, number[]> = {};

  batches.forEach(batch => {
    for (let i = 1; i < (batch.history?.length || 0); i++) {
      const prevEvent = batch.history![i - 1];
      const currEvent = batch.history![i];
      const key = `${prevEvent.status}_to_${currEvent.status}`;
      const hours = differenceInHours(
        parseISO(currEvent.timestamp),
        parseISO(prevEvent.timestamp)
      );

      if (!transitTimeSamples[key]) {
        transitTimeSamples[key] = [];
      }
      transitTimeSamples[key].push(hours);
    }
  });

  // Calculate averages
  Object.keys(transitTimeSamples).forEach(key => {
    const samples = transitTimeSamples[key];
    avgTransitTimes[key] = samples.reduce((a, b) => a + b, 0) / samples.length;
  });

  // Detect timing anomalies
  batches.forEach(batch => {
    for (let i = 1; i < (batch.history?.length || 0); i++) {
      const prevEvent = batch.history![i - 1];
      const currEvent = batch.history![i];
      const key = `${prevEvent.status}_to_${currEvent.status}`;
      const hours = differenceInHours(
        parseISO(currEvent.timestamp),
        parseISO(prevEvent.timestamp)
      );

      const avgTime = avgTransitTimes[key];
      if (avgTime && hours > avgTime * 2) {
        // Transit time is more than 2x average
        anomalies.push({
          id: `timing-${batch.id}-${i}`,
          type: 'timing',
          severity: hours > avgTime * 3 ? 'high' : 'medium',
          batchId: batch.id,
          drugName: getBatchDrugName(batch) || 'Unknown',
          description: `Unusual delay between ${prevEvent.status} and ${currEvent.status}`,
          detectedAt: new Date().toISOString(),
          location: currEvent.location,
          expectedValue: `${Math.round(avgTime)} hours`,
          actualValue: `${Math.round(hours)} hours`,
          confidence: 85,
          status: 'new',
        });
      }
    }

    // Detect expiring batches
    const expDate = getBatchExpiryDate(batch);
    if (expDate) {
      const daysUntilExpiry = differenceInHours(parseISO(expDate), now) / 24;
      if (daysUntilExpiry > 0 && daysUntilExpiry <= 30 && batch.status !== 'Delivered') {
        anomalies.push({
          id: `expiry-${batch.id}`,
          type: 'timing',
          severity: daysUntilExpiry <= 7 ? 'critical' : daysUntilExpiry <= 14 ? 'high' : 'medium',
          batchId: batch.id,
          drugName: getBatchDrugName(batch) || 'Unknown',
          description: `Batch expiring in ${Math.round(daysUntilExpiry)} days but not yet dispensed`,
          detectedAt: new Date().toISOString(),
          expectedValue: 'Delivered',
          actualValue: batch.status,
          confidence: 95,
          status: 'new',
        });
      }
    }

    // Detect quantity anomalies (simplified)
    const qty = getBatchQuantity(batch);
    if (qty && (qty > 10000 || qty < 10)) {
      anomalies.push({
        id: `quantity-${batch.id}`,
        type: 'quantity',
        severity: 'low',
        batchId: batch.id,
        drugName: getBatchDrugName(batch) || 'Unknown',
        description: `Unusual batch quantity detected`,
        detectedAt: new Date().toISOString(),
        expectedValue: '100-10000 units',
        actualValue: qty,
        confidence: 70,
        status: 'new',
      });
    }
  });

  return anomalies
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, 20); // Top 20 anomalies
}

/**
 * Calculate performance metrics
 */
export function calculatePerformanceMetrics(
  batches: Batch[],
  previousBatches?: Batch[]
): PerformanceMetrics[] {
  const currentMetrics = calculateBatchMetrics(batches);
  const previousMetrics = previousBatches
    ? calculateBatchMetrics(previousBatches)
    : null;

  const calculateChange = (current: number, previous: number | null) => {
    if (previous === null || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const metrics: PerformanceMetrics[] = [
    {
      metric: 'Total Batches',
      value: currentMetrics.totalBatches,
      unit: 'batches',
      change: calculateChange(
        currentMetrics.totalBatches,
        previousMetrics?.totalBatches || null
      ),
      trend: currentMetrics.totalBatches > (previousMetrics?.totalBatches || 0) ? 'up' : 'down',
      status: 'good',
    },
    {
      metric: 'Verification Rate',
      value: currentMetrics.verificationRate,
      unit: '%',
      change: calculateChange(
        currentMetrics.verificationRate,
        previousMetrics?.verificationRate || null
      ),
      trend: currentMetrics.verificationRate > (previousMetrics?.verificationRate || 0) ? 'up' : 'down',
      target: 95,
      status: currentMetrics.verificationRate >= 95 ? 'good' : currentMetrics.verificationRate >= 85 ? 'warning' : 'critical',
    },
    {
      metric: 'Average Transit Time',
      value: currentMetrics.averageTransitTime,
      unit: 'hours',
      change: calculateChange(
        currentMetrics.averageTransitTime,
        previousMetrics?.averageTransitTime || null
      ),
      trend: currentMetrics.averageTransitTime < (previousMetrics?.averageTransitTime || Infinity) ? 'down' : 'up',
      target: 48,
      status: currentMetrics.averageTransitTime <= 48 ? 'good' : currentMetrics.averageTransitTime <= 72 ? 'warning' : 'critical',
    },
    {
      metric: 'Recall Rate',
      value: currentMetrics.recallRate,
      unit: '%',
      change: calculateChange(
        currentMetrics.recallRate,
        previousMetrics?.recallRate || null
      ),
      trend: currentMetrics.recallRate < (previousMetrics?.recallRate || Infinity) ? 'down' : 'up',
      target: 1,
      status: currentMetrics.recallRate <= 1 ? 'good' : currentMetrics.recallRate <= 3 ? 'warning' : 'critical',
    },
  ];

  return metrics;
}

/**
 * Calculate inventory metrics
 */
export function calculateInventoryMetrics(batches: Batch[]): InventoryMetrics {
  const totalUnits = batches.reduce((sum, b) => sum + (getBatchQuantity(b) || 0), 0);

  const unitsInTransit = batches
    .filter(b => b.status === 'In-Transit')
    .reduce((sum, b) => sum + (getBatchQuantity(b) || 0), 0);

  const unitsAtDistributors = batches
    .filter(b => b.status === 'Pending')
    .reduce((sum, b) => sum + (getBatchQuantity(b) || 0), 0);

  const unitsAtPharmacies = batches
    .filter(b => b.status === 'Approved')
    .reduce((sum, b) => sum + (getBatchQuantity(b) || 0), 0);

  // Calculate stockout risk (simplified)
  const activeBatches = batches.filter(b => !['Delivered', 'Blocked'].includes(b.status));
  const stockoutRisk = activeBatches.length < 10 ? 80 : activeBatches.length < 50 ? 40 : 10;

  // Expiring stock
  const thirtyDaysFromNow = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringStock = batches.filter(b => {
    const expDate = getBatchExpiryDate(b);
    if (!expDate) return false;
    return new Date(expDate) <= thirtyDaysFromNow;
  }).reduce((sum, b) => sum + (getBatchQuantity(b) || 0), 0);

  return {
    totalUnits,
    unitsInTransit,
    unitsAtDistributors,
    unitsAtPharmacies,
    stockoutRisk,
    overstockItems: [],
    expiringStock,
  };
}

/**
 * Main function to generate complete dashboard data
 */
export function generateAnalyticsDashboardData(batches: Batch[]): AnalyticsDashboardData {
  return {
    batchMetrics: calculateBatchMetrics(batches),
    supplyChainMetrics: calculateSupplyChainMetrics(batches),
    drugCategoryMetrics: calculateDrugCategoryMetrics(batches),
    timeSeriesData: generateTimeSeriesData(batches, 30),
    geographicData: generateGeographicData(batches),
    demandForecasts: generateDemandForecasts(batches),
    anomalies: detectAnomalies(batches),
    performanceMetrics: calculatePerformanceMetrics(batches),
    supplyChainGraph: { nodes: [], edges: [] }, // To be implemented with full supply chain data
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
    inventoryMetrics: calculateInventoryMetrics(batches),
    lastUpdated: new Date().toISOString(),
  };
}
