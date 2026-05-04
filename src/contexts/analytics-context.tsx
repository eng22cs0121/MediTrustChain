"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useBatches } from '@/contexts/batches-context';
import { useCbacAuth } from '@/contexts/cbac-auth-context';
import type {
  AnalyticsDashboardData,
  AnalyticsFilters,
  AnomalyDetection,
  DemandForecast,
  PerformanceMetrics,
} from '@/types/analytics';
import { generateAnalyticsDashboardData } from '@/lib/analytics/data-processor-simple';
import type { Batch } from '@/contexts/batches-context';
import { isWithinInterval, parseISO, subDays } from 'date-fns';

interface AnalyticsContextType {
  dashboardData: AnalyticsDashboardData | null;
  isLoading: boolean;
  error: string | null;
  filters: AnalyticsFilters;
  updateFilters: (filters: Partial<AnalyticsFilters>) => void;
  resetFilters: () => void;
  refreshData: () => Promise<void>;
  exportData: (format: 'pdf' | 'csv' | 'xlsx' | 'json') => Promise<void>;
  markAnomalyResolved: (anomalyId: string) => void;
  markAnomalyInvestigating: (anomalyId: string) => void;
  markAnomalyFalsePositive: (anomalyId: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

const defaultFilters: AnalyticsFilters = {
  dateRange: {
    start: subDays(new Date(), 30).toISOString(),
    end: new Date().toISOString(),
  },
  drugCategories: [],
  manufacturers: [],
  locations: [],
  statuses: [],
  severityLevels: [],
};

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { batches, isLoading: isBatchesLoading } = useBatches();
  const { organizationType } = useCbacAuth();
  const [dashboardData, setDashboardData] = useState<AnalyticsDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters);
  const [anomalyUpdates, setAnomalyUpdates] = useState<Record<string, AnomalyDetection['status']>>({});

  // Filter batches based on current filters
  const filteredBatches = useMemo(() => {
    if (isBatchesLoading) return [];
    let filtered = [...batches];

    // Date range filter
    if (filters.dateRange) {
      const start = parseISO(filters.dateRange.start);
      const end = parseISO(filters.dateRange.end);
      filtered = filtered.filter(batch => {
        const batchDate = batch.history?.[0]?.timestamp;
        if (!batchDate) return false;
        const date = parseISO(batchDate);
        return isWithinInterval(date, { start, end });
      });
    }

    // Drug category filter - Currently not supported as Batch type doesn't have drugCategory
    // TODO: Add drugCategory to Batch type if needed
    // if (filters.drugCategories && filters.drugCategories.length > 0) {
    //   filtered = filtered.filter(batch =>
    //     filters.drugCategories!.includes(batch.drugCategory || 'Uncategorized')
    //   );
    // }

    // Manufacturer filter
    if (filters.manufacturers && filters.manufacturers.length > 0) {
      filtered = filtered.filter(batch =>
        filters.manufacturers!.includes(batch.manufacturer || '')
      );
    }

    // Status filter
    if (filters.statuses && filters.statuses.length > 0) {
      filtered = filtered.filter(batch =>
        filters.statuses!.includes(batch.status)
      );
    }

    // Location filter
    if (filters.locations && filters.locations.length > 0) {
      filtered = filtered.filter(batch =>
        batch.history?.some(h =>
          filters.locations!.some(loc => h.location?.includes(loc))
        )
      );
    }

    // Organization type-based filtering
    if (organizationType === 'manufacturer' && filtered.length > 0) {
      // In production, filter by actual manufacturer user ID
      // For now, show all for manufacturers
    } else if (organizationType === 'distributor') {
      // Filter batches that passed through distributor
      filtered = filtered.filter(batch =>
        batch.history?.some(h => h.location?.includes('Distributor'))
      );
    } else if (organizationType === 'pharmacy') {
      // Filter batches that reached pharmacy
      filtered = filtered.filter(batch =>
        batch.history?.some(h => h.location?.includes('Pharmacy'))
      );
    }

    return filtered;
  }, [batches, filters, organizationType]);

  // Generate analytics data
  const processAnalytics = useCallback(async () => {
    if (!organizationType || (organizationType !== 'manufacturer' && organizationType !== 'regulator')) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate dashboard data from filtered batches
      const data = generateAnalyticsDashboardData(filteredBatches);

      // Apply anomaly status updates
      if (Object.keys(anomalyUpdates).length > 0) {
        data.anomalies = data.anomalies.map(anomaly => {
          if (anomalyUpdates[anomaly.id]) {
            return { ...anomaly, status: anomalyUpdates[anomaly.id] };
          }
          return anomaly;
        });
      }

      // Apply severity filter to anomalies
      if (filters.severityLevels && filters.severityLevels.length > 0) {
        data.anomalies = data.anomalies.filter(anomaly =>
          filters.severityLevels!.includes(anomaly.severity)
        );
      }

      setDashboardData(data);
    } catch (err) {
      console.error('Failed to process analytics:', err);
      setError('Failed to process analytics data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filteredBatches, organizationType, filters.severityLevels, anomalyUpdates]);

  // Process analytics when data changes
  useEffect(() => {
    processAnalytics();
  }, [processAnalytics]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setAnomalyUpdates({});
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    await processAnalytics();
  }, [processAnalytics]);

  // Export data
  const exportData = useCallback(async (format: 'pdf' | 'csv' | 'xlsx' | 'json') => {
    if (!dashboardData) return;

    try {
      if (format === 'json') {
        const dataStr = JSON.stringify(dashboardData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `analytics-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      } else if (format === 'csv') {
        // Export metrics as CSV
        let csv = 'Metric,Value,Unit,Change,Status\n';
        dashboardData.performanceMetrics.forEach(metric => {
          csv += `${metric.metric},${metric.value},${metric.unit},${metric.change}%,${metric.status}\n`;
        });

        const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        const exportFileDefaultName = `analytics-${new Date().toISOString().split('T')[0]}.csv`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      } else {
        // PDF and XLSX export would require additional libraries
        console.warn(`Export format ${format} not yet implemented`);
      }
    } catch (err) {
      console.error('Failed to export data:', err);
      throw new Error('Failed to export data');
    }
  }, [dashboardData]);

  // Anomaly management functions
  const markAnomalyResolved = useCallback((anomalyId: string) => {
    setAnomalyUpdates(prev => ({ ...prev, [anomalyId]: 'resolved' }));
  }, []);

  const markAnomalyInvestigating = useCallback((anomalyId: string) => {
    setAnomalyUpdates(prev => ({ ...prev, [anomalyId]: 'investigating' }));
  }, []);

  const markAnomalyFalsePositive = useCallback((anomalyId: string) => {
    setAnomalyUpdates(prev => ({ ...prev, [anomalyId]: 'false_positive' }));
  }, []);

  const value: AnalyticsContextType = {
    dashboardData,
    isLoading,
    error,
    filters,
    updateFilters,
    resetFilters,
    refreshData,
    exportData,
    markAnomalyResolved,
    markAnomalyInvestigating,
    markAnomalyFalsePositive,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
