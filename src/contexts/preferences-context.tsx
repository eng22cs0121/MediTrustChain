"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationPreferences, BatchTemplate } from '@/types/preferences';

interface PreferencesContextType {
  // Notification preferences
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (preferences: Partial<NotificationPreferences>) => void;
  resetNotificationPreferences: () => void;
  
  // Batch templates
  batchTemplates: BatchTemplate[];
  createTemplate: (template: Omit<BatchTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
  updateTemplate: (id: string, updates: Partial<BatchTemplate>) => void;
  deleteTemplate: (id: string) => void;
  useTemplate: (id: string) => BatchTemplate | undefined;
  
  // Loading state
  isLoading: boolean;
}

const defaultNotificationPreferences: NotificationPreferences = {
  emailEnabled: true,
  categories: {
    batchUpdates: true,
    recalls: true,
    verificationAlerts: true,
    tamperingAlerts: true,
    expiryWarnings: true,
    shipmentUpdates: true,
    systemAlerts: true,
    securityAlerts: true,
  },
  deliveryMethods: {
    email: true,
    sms: false,
    push: true,
    inApp: true,
  },
  timing: {
    immediate: true,
    digest: 'never',
    quietHoursEnabled: false,
  },
  priority: {
    critical: true,
    high: true,
    medium: true,
    low: true,
  },
  advanced: {
    autoMarkAsRead: false,
    soundEnabled: true,
    vibrationEnabled: true,
    showPreview: true,
    groupSimilar: true,
  },
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [batchTemplates, setBatchTemplates] = useState<BatchTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('meditrust-notification-preferences');
    const savedTemplates = localStorage.getItem('meditrust-batch-templates');
    
    if (savedPreferences) {
      setNotificationPreferences(JSON.parse(savedPreferences));
    }
    if (savedTemplates) {
      setBatchTemplates(JSON.parse(savedTemplates));
    }
    
    setIsLoading(false);
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('meditrust-notification-preferences', JSON.stringify(notificationPreferences));
    }
  }, [notificationPreferences, isLoading]);

  // Save templates to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('meditrust-batch-templates', JSON.stringify(batchTemplates));
    }
  }, [batchTemplates, isLoading]);

  const updateNotificationPreferences = (preferences: Partial<NotificationPreferences>) => {
    setNotificationPreferences(prev => ({
      ...prev,
      ...preferences,
      categories: { ...prev.categories, ...preferences.categories },
      deliveryMethods: { ...prev.deliveryMethods, ...preferences.deliveryMethods },
      timing: { ...prev.timing, ...preferences.timing },
      priority: { ...prev.priority, ...preferences.priority },
      advanced: { ...prev.advanced, ...preferences.advanced },
    }));
  };

  const resetNotificationPreferences = () => {
    setNotificationPreferences(defaultNotificationPreferences);
  };

  const createTemplate = (template: Omit<BatchTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    const newTemplate: BatchTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
    };
    
    setBatchTemplates(prev => [...prev, newTemplate]);
  };

  const updateTemplate = (id: string, updates: Partial<BatchTemplate>) => {
    setBatchTemplates(prev => prev.map(template =>
      template.id === id
        ? { ...template, ...updates, updatedAt: new Date() }
        : template
    ));
  };

  const deleteTemplate = (id: string) => {
    setBatchTemplates(prev => prev.filter(template => template.id !== id));
  };

  const useTemplate = (id: string) => {
    const template = batchTemplates.find(t => t.id === id);
    if (template) {
      updateTemplate(id, {
        usageCount: template.usageCount + 1,
        lastUsed: new Date(),
      });
      return template;
    }
    return undefined;
  };

  return (
    <PreferencesContext.Provider value={{
      notificationPreferences,
      updateNotificationPreferences,
      resetNotificationPreferences,
      batchTemplates,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      useTemplate,
      isLoading,
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}
