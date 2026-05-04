/**
 * Analytics Types and Interfaces
 * For enhanced dashboard metrics and visualizations
 */

export interface BatchMetrics {
  totalBatches: number;
  activeBatches: number;
  completedBatches: number;
  averageTransitTime: number; // in hours
  verificationRate: number; // percentage
  recallRate: number; // percentage
  expiringWithin30Days: number;
  tamperingIncidents: number;
}

export interface SupplyChainMetrics {
  manufacturerCount: number;
  distributorCount: number;
  pharmacyCount: number;
  totalTransactions: number;
  averageDeliveryTime: number; // in hours
  onTimeDeliveryRate: number; // percentage
  inventoryTurnover: number;
  bottleneckLocations: string[];
}

export interface DrugCategoryMetrics {
  category: string;
  totalBatches: number;
  value: number; // for charts
  averagePrice?: number;
  popularityScore: number;
  growthRate: number; // percentage
}

export interface TimeSeriesData {
  date: string; // ISO date string
  manufactured: number;
  distributed: number;
  dispensed: number;
  verified: number;
  recalls?: number;
  revenue?: number;
}

export interface GeographicData {
  location: string;
  state?: string;
  city?: string;
  batches: number;
  verifications: number;
  incidents: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface DemandForecast {
  drugName: string;
  drugCategory: string;
  currentDemand: number;
  predictedDemand: number;
  growthRate: number;
  confidence: number; // 0-100
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonalFactors?: string[];
}

export interface AnomalyDetection {
  id: string;
  type: 'timing' | 'location' | 'quantity' | 'verification' | 'tampering';
  severity: 'low' | 'medium' | 'high' | 'critical';
  batchId: string;
  drugName: string;
  description: string;
  detectedAt: string;
  location?: string;
  expectedValue?: string | number;
  actualValue?: string | number;
  confidence: number; // 0-100
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
}

export interface PerformanceMetrics {
  metric: string;
  value: number;
  unit: string;
  change: number; // percentage change from previous period
  trend: 'up' | 'down' | 'stable';
  target?: number;
  status: 'good' | 'warning' | 'critical';
}

export interface SupplyChainNode {
  id: string;
  type: 'manufacturer' | 'distributor' | 'pharmacy' | 'patient';
  name: string;
  location: string;
  batchesHandled: number;
  averageProcessingTime: number; // hours
  reliability: number; // percentage
  connections: string[]; // IDs of connected nodes
}

export interface SupplyChainEdge {
  from: string;
  to: string;
  batchCount: number;
  averageTransitTime: number;
  reliability: number;
}

export interface SupplyChainGraph {
  nodes: SupplyChainNode[];
  edges: SupplyChainEdge[];
}

export interface ComplianceMetrics {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  complianceRate: number; // percentage
  criticalViolations: number;
  pendingReviews: number;
  averageResolutionTime: number; // hours
}

export interface RevenueMetrics {
  totalRevenue: number;
  revenueByCategory: Record<string, number>;
  revenueByRegion: Record<string, number>;
  averageOrderValue: number;
  growthRate: number; // percentage
  projectedRevenue: number;
}

export interface InventoryMetrics {
  totalUnits: number;
  unitsInTransit: number;
  unitsAtDistributors: number;
  unitsAtPharmacies: number;
  stockoutRisk: number; // percentage
  overstockItems: string[];
  expiringStock: number;
}

export interface AlertThresholds {
  transitTimeThreshold: number; // hours
  verificationRateThreshold: number; // percentage
  tamperingThreshold: number; // count
  expiryWarningDays: number;
  anomalyConfidenceThreshold: number; // 0-100
}

export interface AnalyticsFilters {
  dateRange: {
    start: string;
    end: string;
  };
  drugCategories?: string[];
  manufacturers?: string[];
  locations?: string[];
  statuses?: string[];
  severityLevels?: string[];
}

export interface AnalyticsDashboardData {
  batchMetrics: BatchMetrics;
  supplyChainMetrics: SupplyChainMetrics;
  drugCategoryMetrics: DrugCategoryMetrics[];
  timeSeriesData: TimeSeriesData[];
  geographicData: GeographicData[];
  demandForecasts: DemandForecast[];
  anomalies: AnomalyDetection[];
  performanceMetrics: PerformanceMetrics[];
  supplyChainGraph: SupplyChainGraph;
  complianceMetrics: ComplianceMetrics;
  revenueMetrics: RevenueMetrics;
  inventoryMetrics: InventoryMetrics;
  lastUpdated: string;
}

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'xlsx' | 'json';
  sections: ('metrics' | 'charts' | 'forecasts' | 'anomalies' | 'all')[];
  dateRange: {
    start: string;
    end: string;
  };
}

// Chart configuration types
export interface ChartConfig {
  colors: string[];
  gradients?: boolean;
  animated?: boolean;
  responsive?: boolean;
  legend?: boolean;
  tooltip?: boolean;
}

export interface HeatmapData {
  hour: number;
  day: string;
  value: number;
  tooltip?: string;
}

export interface FunnelData {
  stage: string;
  value: number;
  percentage: number;
  color?: string;
}

// Real-time data types
export interface RealtimeUpdate {
  type: 'batch_created' | 'status_changed' | 'verification' | 'anomaly_detected' | 'recall';
  data: any;
  timestamp: string;
}
