"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PerformanceMetrics } from "@/types/analytics";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PerformanceMetricsDashboardProps {
  metrics: PerformanceMetrics[];
}

export function PerformanceMetricsDashboard({ metrics }: PerformanceMetricsDashboardProps) {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      case 'stable':
        return Minus;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', metric: string) => {
    // For some metrics, "down" is good (e.g., recall rate, transit time)
    const lowerIsBetter = metric.includes('Time') || metric.includes('Rate');
    
    if (trend === 'stable') return 'text-blue-600';
    if (lowerIsBetter) {
      return trend === 'down' ? 'text-green-600' : 'text-red-600';
    }
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  };

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return 'bg-green-500/10 border-green-500';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500';
      case 'critical':
        return 'bg-red-500/10 border-red-500';
    }
  };

  const getStatusIcon = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'critical':
        return '🚨';
    }
  };

  const calculateProgress = (metric: PerformanceMetrics) => {
    if (!metric.target) return null;
    return Math.min(100, (metric.value / metric.target) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          Performance Metrics
        </CardTitle>
        <CardDescription>
          Key performance indicators with trends and targets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {metrics.map((metric, index) => {
            const TrendIcon = getTrendIcon(metric.trend);
            const trendColor = getTrendColor(metric.trend, metric.metric);
            const statusColor = getStatusColor(metric.status);
            const statusIcon = getStatusIcon(metric.status);
            const progress = calculateProgress(metric);

            return (
              <div
                key={`${metric.metric}-${index}`}
                className={`p-4 rounded-lg border-2 ${statusColor} hover:shadow-md transition-shadow`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{statusIcon}</span>
                        <h4 className="font-semibold">{metric.metric}</h4>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">
                          {metric.value.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {metric.unit}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`flex items-center gap-1 ${trendColor}`}>
                        <TrendIcon className="h-4 w-4" />
                        <span className="text-sm font-semibold">
                          {metric.change > 0 ? '+' : ''}
                          {metric.change.toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">vs. previous</span>
                    </div>
                  </div>

                  {metric.target && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Target: {metric.target.toLocaleString()} {metric.unit}
                        </span>
                        {progress !== null && (
                          <span className="font-semibold">
                            {progress.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      {progress !== null && (
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full transition-all ${
                              metric.status === 'good'
                                ? 'bg-green-500'
                                : metric.status === 'warning'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {metric.status === 'good' && 'Performance meets or exceeds target'}
                    {metric.status === 'warning' && 'Performance below optimal levels'}
                    {metric.status === 'critical' && 'Immediate attention required'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
