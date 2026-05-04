"use client";

import { useState } from "react";
import { usePreferences } from "@/contexts/preferences-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, MessageSquare, Smartphone, Clock, Shield, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function NotificationPreferencesPanel() {
  const { notificationPreferences, updateNotificationPreferences, resetNotificationPreferences } = usePreferences();
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    toast({
      title: "Preferences saved",
      description: "Your notification preferences have been updated.",
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    resetNotificationPreferences();
    toast({
      title: "Preferences reset",
      description: "Your notification preferences have been reset to defaults.",
    });
    setHasChanges(false);
  };

  const updateCategory = (category: keyof typeof notificationPreferences.categories, value: boolean) => {
    updateNotificationPreferences({
      categories: { ...notificationPreferences.categories, [category]: value }
    });
    setHasChanges(true);
  };

  const updateDeliveryMethod = (method: keyof typeof notificationPreferences.deliveryMethods, value: boolean) => {
    updateNotificationPreferences({
      deliveryMethods: { ...notificationPreferences.deliveryMethods, [method]: value }
    });
    setHasChanges(true);
  };

  const updatePriority = (priority: keyof typeof notificationPreferences.priority, value: boolean) => {
    updateNotificationPreferences({
      priority: { ...notificationPreferences.priority, [priority]: value }
    });
    setHasChanges(true);
  };

  const updateAdvanced = (setting: keyof typeof notificationPreferences.advanced, value: boolean) => {
    updateNotificationPreferences({
      advanced: { ...notificationPreferences.advanced, [setting]: value }
    });
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
          <p className="text-muted-foreground">Manage how and when you receive notifications</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="timing">Timing</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Categories
              </CardTitle>
              <CardDescription>
                Choose which types of notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="batch-updates" className="text-base">Batch Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications about batch status changes
                  </p>
                </div>
                <Switch
                  id="batch-updates"
                  checked={notificationPreferences.categories.batchUpdates}
                  onCheckedChange={(checked) => updateCategory('batchUpdates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="recalls" className="text-base">Product Recalls</Label>
                  <p className="text-sm text-muted-foreground">
                    Critical recall notifications (highly recommended)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Critical</Badge>
                  <Switch
                    id="recalls"
                    checked={notificationPreferences.categories.recalls}
                    onCheckedChange={(checked) => updateCategory('recalls', checked)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="verification" className="text-base">Verification Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    When batches are verified or authentication fails
                  </p>
                </div>
                <Switch
                  id="verification"
                  checked={notificationPreferences.categories.verificationAlerts}
                  onCheckedChange={(checked) => updateCategory('verificationAlerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="tampering" className="text-base">Tampering Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Immediate alerts for suspected tampering
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">High Priority</Badge>
                  <Switch
                    id="tampering"
                    checked={notificationPreferences.categories.tamperingAlerts}
                    onCheckedChange={(checked) => updateCategory('tamperingAlerts', checked)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="expiry" className="text-base">Expiry Warnings</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerts for batches nearing expiration
                  </p>
                </div>
                <Switch
                  id="expiry"
                  checked={notificationPreferences.categories.expiryWarnings}
                  onCheckedChange={(checked) => updateCategory('expiryWarnings', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="shipment" className="text-base">Shipment Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Track shipment status and delivery
                  </p>
                </div>
                <Switch
                  id="shipment"
                  checked={notificationPreferences.categories.shipmentUpdates}
                  onCheckedChange={(checked) => updateCategory('shipmentUpdates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="system" className="text-base">System Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Platform updates and maintenance notices
                  </p>
                </div>
                <Switch
                  id="system"
                  checked={notificationPreferences.categories.systemAlerts}
                  onCheckedChange={(checked) => updateCategory('systemAlerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="security" className="text-base">Security Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Account security and login notifications
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Recommended</Badge>
                  <Switch
                    id="security"
                    checked={notificationPreferences.categories.securityAlerts}
                    onCheckedChange={(checked) => updateCategory('securityAlerts', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Methods Tab */}
        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Methods</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="email" className="text-base">Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch
                  id="email"
                  checked={notificationPreferences.deliveryMethods.email}
                  onCheckedChange={(checked) => updateDeliveryMethod('email', checked)}
                />
              </div>

              {notificationPreferences.deliveryMethods.email && (
                <div className="ml-8 space-y-2">
                  <Label htmlFor="email-address">Email Address</Label>
                  <Input
                    id="email-address"
                    type="email"
                    placeholder="your@email.com"
                    value={notificationPreferences.emailAddress || ''}
                    onChange={(e) => {
                      updateNotificationPreferences({ emailAddress: e.target.value });
                      setHasChanges(true);
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="sms" className="text-base">SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive text messages for critical alerts
                    </p>
                  </div>
                </div>
                <Switch
                  id="sms"
                  checked={notificationPreferences.deliveryMethods.sms}
                  onCheckedChange={(checked) => updateDeliveryMethod('sms', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="push" className="text-base">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Browser push notifications
                    </p>
                  </div>
                </div>
                <Switch
                  id="push"
                  checked={notificationPreferences.deliveryMethods.push}
                  onCheckedChange={(checked) => updateDeliveryMethod('push', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="in-app" className="text-base">In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications within the platform
                    </p>
                  </div>
                </div>
                <Switch
                  id="in-app"
                  checked={notificationPreferences.deliveryMethods.inApp}
                  onCheckedChange={(checked) => updateDeliveryMethod('inApp', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Priority Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Priority Filters
              </CardTitle>
              <CardDescription>
                Filter notifications by priority level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="critical" className="text-base">Critical</Label>
                  <Badge variant="destructive" className="ml-2">Highest</Badge>
                </div>
                <Switch
                  id="critical"
                  checked={notificationPreferences.priority.critical}
                  onCheckedChange={(checked) => updatePriority('critical', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="high" className="text-base">High</Label>
                  <Badge variant="default" className="ml-2">High</Badge>
                </div>
                <Switch
                  id="high"
                  checked={notificationPreferences.priority.high}
                  onCheckedChange={(checked) => updatePriority('high', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="medium" className="text-base">Medium</Label>
                  <Badge variant="secondary" className="ml-2">Medium</Badge>
                </div>
                <Switch
                  id="medium"
                  checked={notificationPreferences.priority.medium}
                  onCheckedChange={(checked) => updatePriority('medium', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="low" className="text-base">Low</Label>
                  <Badge variant="outline" className="ml-2">Low</Badge>
                </div>
                <Switch
                  id="low"
                  checked={notificationPreferences.priority.low}
                  onCheckedChange={(checked) => updatePriority('low', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timing Tab */}
        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Notification Timing
              </CardTitle>
              <CardDescription>
                Control when and how often you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="immediate" className="text-base">Immediate Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications as they occur
                  </p>
                </div>
                <Switch
                  id="immediate"
                  checked={notificationPreferences.timing.immediate}
                  onCheckedChange={(checked) => {
                    updateNotificationPreferences({
                      timing: { ...notificationPreferences.timing, immediate: checked }
                    });
                    setHasChanges(true);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="digest">Digest Frequency</Label>
                <Select
                  value={notificationPreferences.timing.digest}
                  onValueChange={(value: any) => {
                    updateNotificationPreferences({
                      timing: { ...notificationPreferences.timing, digest: value }
                    });
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger id="digest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Group non-urgent notifications into a digest
                </p>
              </div>

              {notificationPreferences.timing.digest !== 'never' && (
                <div className="space-y-2">
                  <Label htmlFor="digest-time">Digest Time</Label>
                  <Input
                    id="digest-time"
                    type="time"
                    value={notificationPreferences.timing.digestTime || '09:00'}
                    onChange={(e) => {
                      updateNotificationPreferences({
                        timing: { ...notificationPreferences.timing, digestTime: e.target.value }
                      });
                      setHasChanges(true);
                    }}
                  />
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="quiet-hours" className="text-base">Quiet Hours</Label>
                    <p className="text-sm text-muted-foreground">
                      Mute non-critical notifications during specific hours
                    </p>
                  </div>
                  <Switch
                    id="quiet-hours"
                    checked={notificationPreferences.timing.quietHoursEnabled}
                    onCheckedChange={(checked) => {
                      updateNotificationPreferences({
                        timing: { ...notificationPreferences.timing, quietHoursEnabled: checked }
                      });
                      setHasChanges(true);
                    }}
                  />
                </div>

                {notificationPreferences.timing.quietHoursEnabled && (
                  <div className="ml-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="quiet-start">Start Time</Label>
                      <Input
                        id="quiet-start"
                        type="time"
                        value={notificationPreferences.timing.quietHoursStart || '22:00'}
                        onChange={(e) => {
                          updateNotificationPreferences({
                            timing: { ...notificationPreferences.timing, quietHoursStart: e.target.value }
                          });
                          setHasChanges(true);
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quiet-end">End Time</Label>
                      <Input
                        id="quiet-end"
                        type="time"
                        value={notificationPreferences.timing.quietHoursEnd || '08:00'}
                        onChange={(e) => {
                          updateNotificationPreferences({
                            timing: { ...notificationPreferences.timing, quietHoursEnd: e.target.value }
                          });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Fine-tune your notification experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-mark" className="text-base">Auto-mark as Read</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically mark notifications as read when viewed
                  </p>
                </div>
                <Switch
                  id="auto-mark"
                  checked={notificationPreferences.advanced.autoMarkAsRead}
                  onCheckedChange={(checked) => updateAdvanced('autoMarkAsRead', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sound" className="text-base">Sound</Label>
                  <p className="text-sm text-muted-foreground">
                    Play a sound when notifications arrive
                  </p>
                </div>
                <Switch
                  id="sound"
                  checked={notificationPreferences.advanced.soundEnabled}
                  onCheckedChange={(checked) => updateAdvanced('soundEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="vibration" className="text-base">Vibration</Label>
                  <p className="text-sm text-muted-foreground">
                    Vibrate device for push notifications
                  </p>
                </div>
                <Switch
                  id="vibration"
                  checked={notificationPreferences.advanced.vibrationEnabled}
                  onCheckedChange={(checked) => updateAdvanced('vibrationEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="preview" className="text-base">Show Preview</Label>
                  <p className="text-sm text-muted-foreground">
                    Display notification content in previews
                  </p>
                </div>
                <Switch
                  id="preview"
                  checked={notificationPreferences.advanced.showPreview}
                  onCheckedChange={(checked) => updateAdvanced('showPreview', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="group" className="text-base">Group Similar</Label>
                  <p className="text-sm text-muted-foreground">
                    Group similar notifications together
                  </p>
                </div>
                <Switch
                  id="group"
                  checked={notificationPreferences.advanced.groupSimilar}
                  onCheckedChange={(checked) => updateAdvanced('groupSimilar', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
