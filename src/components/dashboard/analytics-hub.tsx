"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAnalyticsData, AnomalyFrequency, ManufacturerScore, DeliveryTimeByRegion } from "@/lib/supabase/analytics";
import { Loader2, TrendingUp, AlertTriangle, Package, Activity } from "lucide-react";
import { MotionDiv } from "@/components/motion-div";

const COLORS = ['#7035db', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export function AnalyticsHub() {
  const [loading, setLoading] = useState(true);
  const [frequencyData, setFrequencyData] = useState<AnomalyFrequency[]>([]);
  const [manufacturerData, setManufacturerData] = useState<ManufacturerScore[]>([]);
  const [deliveryData, setDeliveryData] = useState<DeliveryTimeByRegion[]>([]);
  const [stats, setStats] = useState({ batches: 0, anomalies: 0 });

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchAnalyticsData();
        setFrequencyData(data.anomalyFrequencyData);
        setManufacturerData(data.manufacturerScoreData);
        setDeliveryData(data.deliveryTimeData);
        setStats({ batches: data.totalBatches, anomalies: data.totalAnomalies });
      } catch (e) {
        console.error("Failed to load analytics", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 border rounded-xl bg-card/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading Analytics Engine...</span>
      </div>
    );
  }

  const safeAnomalyRate = stats.batches > 0 ? ((stats.anomalies / stats.batches) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel dark:glass-panel-dark transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Batches</p>
              <h3 className="text-2xl font-bold">{stats.batches.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-panel dark:glass-panel-dark transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-destructive-subtle rounded-full">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Anomalies</p>
              <h3 className="text-2xl font-bold">{stats.anomalies.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel dark:glass-panel-dark transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-warning/10 rounded-full">
              <Activity className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Anomaly Rate</p>
              <h3 className="text-2xl font-bold">{safeAnomalyRate}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel dark:glass-panel-dark transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-success-subtle rounded-full">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Regions</p>
              <h3 className="text-2xl font-bold">{deliveryData.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomaly Frequency Area Chart */}
        <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full glass-panel dark:glass-panel-dark">
            <CardHeader>
              <CardTitle>Anomaly Frequency (Last 30 Days)</CardTitle>
              <CardDescription>Number of AI-flagged anomalies over time.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={frequencyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="count" stroke="#ef4444" fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>

        {/* Delivery Times Bar Chart */}
        <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full glass-panel dark:glass-panel-dark">
            <CardHeader>
              <CardTitle>Average Transit Time by Region</CardTitle>
              <CardDescription>Days from dispatch to delivery.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deliveryData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="region" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="avgDays" fill="#7035db" radius={[0, 4, 4, 0]} name="Days" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>

        {/* Manufacturer Performance Score */}
        <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Manufacturer Trust Score</CardTitle>
              <CardDescription>Performance ranking based on anomaly rates and batch volume.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={manufacturerData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Bar dataKey="score" name="Trust Score (0-100)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40}>
                      {
                        manufacturerData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.score > 80 ? '#10b981' : entry.score > 50 ? '#f59e0b' : '#ef4444'} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>
      </div>
    </div>
  );
}
