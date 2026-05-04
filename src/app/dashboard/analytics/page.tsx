"use client";

import { useEffect } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionDiv } from "@/components/motion-div";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalytics } from "@/contexts/analytics-context";
import { useCbacAuth } from "@/contexts/cbac-auth-context";
import {
  BarChart as RechartsBarChart,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Line,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Loader2, AlertTriangle, Download, Filter, RefreshCw, TrendingUp, Package, Users, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnomalyDetectionDashboard } from "@/components/dashboard/anomaly-detection-dashboard";
import { DemandForecastDashboard } from "@/components/dashboard/demand-forecast-dashboard";
import { PerformanceMetricsDashboard } from "@/components/dashboard/performance-metrics-dashboard";
import { GeographicDistribution } from "@/components/dashboard/geographic-distribution";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EnhancedAnalyticsPage() {
  const { organizationType, isAdmin } = useCbacAuth();
  const {
    dashboardData,
    isLoading,
    error,
    refreshData,
    exportData,
    markAnomalyResolved,
    markAnomalyInvestigating,
    markAnomalyFalsePositive,
  } = useAnalytics();
  const { toast } = useToast();

  const handleExport = async (format: 'pdf' | 'csv' | 'xlsx' | 'json') => {
    try {
      await exportData(format);
      toast({
        title: "Export Successful",
        description: `Analytics data exported as ${format.toUpperCase()}`,
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Failed to export analytics data",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshData();
      toast({
        title: "Data Refreshed",
        description: "Analytics data has been updated",
      });
    } catch (err) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh analytics data",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin && organizationType !== 'manufacturer' && organizationType !== 'regulator') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          The analytics dashboard is not available for your organization type.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">An Error Occurred</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Data Available</h2>
        <p className="text-muted-foreground">
          Create some batches to see analytics
        </p>
      </div>
    );
  }

  const { batchMetrics, supplyChainMetrics, drugCategoryMetrics, timeSeriesData, geographicData, demandForecasts, anomalies, performanceMetrics, inventoryMetrics } = dashboardData;

  return (
    <ProtectedRoute allowedTypes={['manufacturer', 'regulator', 'admin']}>
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold font-headline bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-500 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Real-time insights and predictive intelligence for your supply chain
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => handleExport('json')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="relative overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-colors bg-card">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full blur-2xl" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Batches</p>
                  <p className="text-3xl font-bold text-primary">{batchMetrics.totalBatches}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {batchMetrics.activeBatches} active
                  </p>
                </div>
                <Package className="h-10 w-10 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 border-success/20 hover:border-success/40 transition-colors bg-card">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-success/20 to-success/30 rounded-full blur-2xl" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Verification Rate</p>
                  <p className="text-3xl font-bold text-success">{batchMetrics.verificationRate}%</p>
                  <Badge variant="outline" className="mt-1 bg-success-subtle border-success/30">
                    {batchMetrics.verificationRate >= 95 ? 'Excellent' : batchMetrics.verificationRate >= 85 ? 'Good' : 'Needs Improvement'}
                  </Badge>
                </div>
                <Activity className="h-10 w-10 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 border-purple-500/20 hover:border-purple-500/40 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-full blur-2xl" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Transit Time</p>
                  <p className="text-3xl font-bold text-purple-600">{batchMetrics.averageTransitTime}h</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {supplyChainMetrics.onTimeDeliveryRate}% on-time
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 border-warning/20 hover:border-warning/40 transition-colors bg-card">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-warning/20 to-warning/30 rounded-full blur-2xl" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Supply Chain</p>
                  <p className="text-3xl font-bold text-warning">
                    {supplyChainMetrics.manufacturerCount + supplyChainMetrics.distributorCount + supplyChainMetrics.pharmacyCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {supplyChainMetrics.totalTransactions} transactions
                  </p>
                </div>
                <Users className="h-10 w-10 text-warning/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            <TabsTrigger value="geographic">Geographic</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Time Series Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Supply Chain Activity Trends</CardTitle>
                <CardDescription>
                  Daily activity across the supply chain over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    manufactured: { label: "Manufactured", color: "hsl(220, 70%, 50%)" },
                    distributed: { label: "Distributed", color: "hsl(160, 60%, 45%)" },
                    dispensed: { label: "Dispensed", color: "hsl(280, 65%, 60%)" },
                    verified: { label: "Verified", color: "hsl(30, 80%, 55%)" },
                  }}
                  className="h-[400px] w-full"
                >
                  <AreaChart data={timeSeriesData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorManufactured" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorDistributed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorDispensed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(280, 65%, 60%)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(280, 65%, 60%)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(30, 80%, 55%)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(30, 80%, 55%)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => format(new Date(value), "MMM d")}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area
                      type="monotone"
                      dataKey="manufactured"
                      stackId="1"
                      stroke="hsl(220, 70%, 50%)"
                      fill="url(#colorManufactured)"
                    />
                    <Area
                      type="monotone"
                      dataKey="distributed"
                      stackId="1"
                      stroke="hsl(160, 60%, 45%)"
                      fill="url(#colorDistributed)"
                    />
                    <Area
                      type="monotone"
                      dataKey="dispensed"
                      stackId="1"
                      stroke="hsl(280, 65%, 60%)"
                      fill="url(#colorDispensed)"
                    />
                    <Area
                      type="monotone"
                      dataKey="verified"
                      stackId="1"
                      stroke="hsl(30, 80%, 55%)"
                      fill="url(#colorVerified)"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Drug Category Distribution */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Drug Category Distribution</CardTitle>
                  <CardDescription>Batch count by drug category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-[300px] w-full">
                    <RechartsBarChart data={drugCategoryMetrics} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis
                        dataKey="category"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="totalBatches" fill="hsl(220, 70%, 50%)" radius={[8, 8, 0, 0]} />
                    </RechartsBarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inventory Status</CardTitle>
                  <CardDescription>Current inventory distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-primary-subtle rounded-lg border border-primary/20">
                      <span className="text-sm font-medium">Total Units</span>
                      <span className="text-2xl font-bold text-primary">
                        {inventoryMetrics.totalUnits.toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">In Transit</p>
                        <p className="text-xl font-bold">{inventoryMetrics.unitsInTransit.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Distributors</p>
                        <p className="text-xl font-bold">{inventoryMetrics.unitsAtDistributors.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Pharmacies</p>
                        <p className="text-xl font-bold">{inventoryMetrics.unitsAtPharmacies.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Expiring Stock (30 days)</span>
                        <span className="font-semibold">{inventoryMetrics.expiringStock.toLocaleString()} units</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Stockout Risk</span>
                        <Badge
                          variant={inventoryMetrics.stockoutRisk > 60 ? 'destructive' : inventoryMetrics.stockoutRisk > 30 ? 'secondary' : 'outline'}
                        >
                          {inventoryMetrics.stockoutRisk}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <PerformanceMetricsDashboard metrics={performanceMetrics} />
          </TabsContent>

          {/* Forecasting Tab */}
          <TabsContent value="forecasting" className="space-y-6">
            <DemandForecastDashboard forecasts={demandForecasts} />
          </TabsContent>

          {/* Anomalies Tab */}
          <TabsContent value="anomalies" className="space-y-6">
            <AnomalyDetectionDashboard
              anomalies={anomalies}
              onMarkResolved={markAnomalyResolved}
              onMarkInvestigating={markAnomalyInvestigating}
              onMarkFalsePositive={markAnomalyFalsePositive}
            />
          </TabsContent>

          {/* Geographic Tab */}
          <TabsContent value="geographic" className="space-y-6">
            <GeographicDistribution data={geographicData} />
          </TabsContent>
        </Tabs>

        {/* Last Updated */}
        <div className="text-center text-xs text-muted-foreground">
          Last updated: {format(parseISO(dashboardData.lastUpdated), 'PPpp')}
        </div>
      </MotionDiv>
    </ProtectedRoute>
  );
}
