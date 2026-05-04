"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DemandForecast } from "@/types/analytics";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DemandForecastDashboardProps {
  forecasts: DemandForecast[];
}

export function DemandForecastDashboard({ forecasts }: DemandForecastDashboardProps) {
  const trendConfig = {
    increasing: {
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-500/10',
      border: 'border-green-500',
      label: 'Increasing',
    },
    decreasing: {
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-500/10',
      border: 'border-red-500',
      label: 'Decreasing',
    },
    stable: {
      icon: Minus,
      color: 'text-blue-600',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500',
      label: 'Stable',
    },
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Demand Forecasting
        </CardTitle>
        <CardDescription>
          AI-powered predictions for upcoming drug demand based on historical trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        {forecasts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Insufficient data for demand forecasting. More historical data needed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {forecasts.map((forecast, index) => {
              const config = trendConfig[forecast.trend];
              const TrendIcon = config.icon;
              const demandChange = forecast.predictedDemand - forecast.currentDemand;
              const demandChangePercent = forecast.growthRate;

              return (
                <div
                  key={`${forecast.drugName}-${index}`}
                  className={`p-4 rounded-lg border-2 ${config.border} ${config.bg} hover:shadow-md transition-all`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <TrendIcon className={`h-6 w-6 ${config.color}`} />
                        <div>
                          <h4 className="font-semibold text-lg">{forecast.drugName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {forecast.drugCategory}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-background/50 p-3 rounded">
                          <p className="text-xs text-muted-foreground mb-1">
                            Current Demand
                          </p>
                          <p className="text-2xl font-bold">{forecast.currentDemand}</p>
                          <p className="text-xs text-muted-foreground">batches/month</p>
                        </div>

                        <div className="bg-background/50 p-3 rounded">
                          <p className="text-xs text-muted-foreground mb-1">
                            Predicted Demand
                          </p>
                          <p className="text-2xl font-bold">{forecast.predictedDemand}</p>
                          <p className="text-xs text-muted-foreground">batches/month</p>
                        </div>

                        <div className="bg-background/50 p-3 rounded">
                          <p className="text-xs text-muted-foreground mb-1">
                            Change
                          </p>
                          <div className="flex items-center gap-2">
                            {demandChange > 0 ? (
                              <ArrowUp className="h-4 w-4 text-green-600" />
                            ) : demandChange < 0 ? (
                              <ArrowDown className="h-4 w-4 text-red-600" />
                            ) : (
                              <Minus className="h-4 w-4 text-gray-600" />
                            )}
                            <span
                              className={`text-xl font-bold ${
                                demandChange > 0
                                  ? 'text-green-600'
                                  : demandChange < 0
                                  ? 'text-red-600'
                                  : 'text-gray-600'
                              }`}
                            >
                              {demandChange > 0 ? '+' : ''}
                              {demandChange}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {demandChangePercent > 0 ? '+' : ''}
                            {demandChangePercent}%
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Forecast Confidence</span>
                          <span className={`font-semibold ${getConfidenceColor(forecast.confidence)}`}>
                            {forecast.confidence}%
                          </span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full transition-all ${getConfidenceBg(forecast.confidence)}`}
                            style={{ width: `${forecast.confidence}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={config.color}>
                          {config.label} Trend
                        </Badge>
                        <Badge variant="secondary">
                          {forecast.growthRate > 0 ? '+' : ''}
                          {forecast.growthRate}% Growth
                        </Badge>
                        {forecast.confidence >= 80 && (
                          <Badge variant="default" className="bg-green-600">
                            High Confidence
                          </Badge>
                        )}
                        {forecast.confidence < 60 && (
                          <Badge variant="destructive">
                            Low Confidence
                          </Badge>
                        )}
                      </div>

                      {forecast.seasonalFactors && forecast.seasonalFactors.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Seasonal Factors:</span>{' '}
                          {forecast.seasonalFactors.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
