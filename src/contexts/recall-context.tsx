"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { BatchRecall, RecallNotification, RecallResponse, RecallClass, RecallStatus, RecallAction } from "@/types/recall";
import { useNotifications } from "./notifications-context";
import { useBatches } from "./batches-context";

interface RecallContextType {
  recalls: BatchRecall[];
  notifications: RecallNotification[];
  responses: RecallResponse[];
  
  // Recall Management
  initiateRecall: (recall: Omit<BatchRecall, 'id' | 'createdAt' | 'updatedAt' | 'notificationsSent' | 'responsesReceived' | 'responseRate' | 'unitsRecovered' | 'unitsOutstanding'>) => BatchRecall;
  updateRecall: (recallId: string, updates: Partial<BatchRecall>) => void;
  terminateRecall: (recallId: string, notes: string) => void;
  
  // Notification Management
  sendRecallNotifications: (recallId: string) => Promise<number>;
  acknowledgeNotification: (notificationId: string) => void;
  
  // Response Management
  submitRecallResponse: (response: Omit<RecallResponse, 'submittedAt'>) => void;
  
  // Queries
  getRecallById: (recallId: string) => BatchRecall | undefined;
  getRecallsByBatch: (batchId: string) => BatchRecall[];
  getActiveRecalls: () => BatchRecall[];
  getRecallNotifications: (recallId: string) => RecallNotification[];
  getRecallStatistics: () => {
    totalRecalls: number;
    activeRecalls: number;
    byClass: { classI: number; classII: number; classIII: number };
    averageResponseRate: number;
  };
}

const RecallContext = createContext<RecallContextType | undefined>(undefined);

export function RecallProvider({ children }: { children: ReactNode }) {
  const [recalls, setRecalls] = useState<BatchRecall[]>([]);
  const [notifications, setNotifications] = useState<RecallNotification[]>([]);
  const [responses, setResponses] = useState<RecallResponse[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  const notificationSystem = useNotifications();
  const { updateBatchStatus } = useBatches();

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedRecalls = localStorage.getItem("meditrust-recalls");
      const storedNotifications = localStorage.getItem("meditrust-recall-notifications");
      const storedResponses = localStorage.getItem("meditrust-recall-responses");
      
      if (storedRecalls) {
        const parsed = JSON.parse(storedRecalls);
        setRecalls(parsed.map((r: any) => ({
          ...r,
          recallDate: new Date(r.recallDate),
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
          completedAt: r.completedAt ? new Date(r.completedAt) : undefined,
          fdaNotificationDate: r.fdaNotificationDate ? new Date(r.fdaNotificationDate) : undefined,
        })));
      }
      
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      }
      
      if (storedResponses) {
        setResponses(JSON.parse(storedResponses));
      }
    } catch (error) {
      console.error("Failed to load recall data:", error);
    }
    setIsMounted(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem("meditrust-recalls", JSON.stringify(recalls));
        localStorage.setItem("meditrust-recall-notifications", JSON.stringify(notifications));
        localStorage.setItem("meditrust-recall-responses", JSON.stringify(responses));
      } catch (error) {
        console.error("Failed to save recall data:", error);
      }
    }
  }, [recalls, notifications, responses, isMounted]);

  // Initiate a new recall
  const initiateRecall = (recallData: Omit<BatchRecall, 'id' | 'createdAt' | 'updatedAt' | 'notificationsSent' | 'responsesReceived' | 'responseRate' | 'unitsRecovered' | 'unitsOutstanding'>) => {
    const recallId = `RCL-${Date.now()}`;
    
    const newRecall: BatchRecall = {
      ...recallData,
      id: recallId,
      createdAt: new Date(),
      updatedAt: new Date(),
      notificationsSent: 0,
      responsesReceived: 0,
      responseRate: 0,
      unitsRecovered: 0,
      unitsOutstanding: recallData.unitsDistributed,
    };

    setRecalls(prev => [newRecall, ...prev]);
    
    // Update batch status to Recalled
    updateBatchStatus(recallData.batchId, "Recalled", undefined, `RECALLED: ${recallData.reason}`);
    
    // System notification
    notificationSystem.addNotification({
      title: `🚨 ${recallData.recallClass} Recall Initiated`,
      description: `Batch ${recallData.batchId} (${recallData.batchName}) has been recalled. Reason: ${recallData.reason}`,
    });

    return newRecall;
  };

  // Update recall details
  const updateRecall = (recallId: string, updates: Partial<BatchRecall>) => {
    setRecalls(prev => prev.map(recall => 
      recall.id === recallId 
        ? { ...recall, ...updates, updatedAt: new Date() }
        : recall
    ));
  };

  // Terminate recall (mark as completed)
  const terminateRecall = (recallId: string, notes: string) => {
    setRecalls(prev => prev.map(recall => 
      recall.id === recallId 
        ? { 
            ...recall, 
            status: 'Terminated' as RecallStatus,
            completedAt: new Date(),
            updatedAt: new Date(),
            notes: `${recall.notes}\n\nTermination: ${notes}`
          }
        : recall
    ));
    
    const recall = recalls.find(r => r.id === recallId);
    if (recall) {
      notificationSystem.addNotification({
        title: "Recall Terminated",
        description: `Recall ${recallId} for batch ${recall.batchId} has been successfully terminated.`,
      });
    }
  };

  // Send notifications to all supply chain participants
  const sendRecallNotifications = async (recallId: string): Promise<number> => {
    const recall = recalls.find(r => r.id === recallId);
    if (!recall) return 0;

    const newNotifications: RecallNotification[] = [];
    
    // Notify distributors
    recall.distributorsNotified.forEach(distributor => {
      newNotifications.push({
        id: `NOTIF-${Date.now()}-${Math.random()}`,
        recallId: recall.id,
        recipientType: 'distributor',
        recipientId: distributor,
        recipientName: distributor,
        recipientEmail: `${distributor.toLowerCase().replace(/\s+/g, '')}@example.com`,
        sentAt: new Date(),
        acknowledged: false,
      });
    });

    // Notify pharmacies
    recall.pharmaciesNotified.forEach(pharmacy => {
      newNotifications.push({
        id: `NOTIF-${Date.now()}-${Math.random()}`,
        recallId: recall.id,
        recipientType: 'pharmacy',
        recipientId: pharmacy,
        recipientName: pharmacy,
        recipientEmail: `${pharmacy.toLowerCase().replace(/\s+/g, '')}@example.com`,
        sentAt: new Date(),
        acknowledged: false,
      });
    });

    setNotifications(prev => [...newNotifications, ...prev]);
    
    // Update recall with notification count
    updateRecall(recallId, {
      notificationsSent: newNotifications.length,
      status: 'In Progress' as RecallStatus,
    });

    // System notification
    notificationSystem.addNotification({
      title: "Recall Notifications Sent",
      description: `${newNotifications.length} notifications sent for recall ${recallId}`,
    });

    return newNotifications.length;
  };

  // Acknowledge receipt of recall notification
  const acknowledgeNotification = (notificationId: string) => {
    setNotifications(prev => prev.map(notif =>
      notif.id === notificationId
        ? { ...notif, acknowledged: true, acknowledgedAt: new Date() }
        : notif
    ));

    // Update recall response rate
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      const recallNotifs = notifications.filter(n => n.recallId === notification.recallId);
      const acknowledgedCount = recallNotifs.filter(n => n.acknowledged).length + 1;
      const responseRate = (acknowledgedCount / recallNotifs.length) * 100;
      
      updateRecall(notification.recallId, {
        responsesReceived: acknowledgedCount,
        responseRate: Math.round(responseRate),
      });
    }
  };

  // Submit recall response with action taken
  const submitRecallResponse = (responseData: Omit<RecallResponse, 'submittedAt'>) => {
    const newResponse: RecallResponse = {
      ...responseData,
      submittedAt: new Date(),
    };

    setResponses(prev => [newResponse, ...prev]);
    
    // Acknowledge the notification
    acknowledgeNotification(responseData.notificationId);
    
    // Update recall with recovered units
    const recall = recalls.find(r => r.id === responseData.recallId);
    if (recall) {
      const totalRecovered = recall.unitsRecovered + responseData.unitsOnHand;
      const outstanding = recall.unitsDistributed - totalRecovered;
      
      updateRecall(responseData.recallId, {
        unitsRecovered: totalRecovered,
        unitsOutstanding: Math.max(0, outstanding),
        status: outstanding === 0 ? 'Completed' as RecallStatus : recall.status,
      });
    }
  };

  // Query functions
  const getRecallById = (recallId: string) => {
    return recalls.find(r => r.id === recallId);
  };

  const getRecallsByBatch = (batchId: string) => {
    return recalls.filter(r => r.batchId === batchId);
  };

  const getActiveRecalls = () => {
    return recalls.filter(r => r.status === 'Initiated' || r.status === 'In Progress' || r.status === 'Ongoing');
  };

  const getRecallNotifications = (recallId: string) => {
    return notifications.filter(n => n.recallId === recallId);
  };

  const getRecallStatistics = () => {
    const activeRecalls = recalls.filter(r => r.status !== 'Terminated' && r.status !== 'Completed');
    
    return {
      totalRecalls: recalls.length,
      activeRecalls: activeRecalls.length,
      byClass: {
        classI: recalls.filter(r => r.recallClass === 'Class I').length,
        classII: recalls.filter(r => r.recallClass === 'Class II').length,
        classIII: recalls.filter(r => r.recallClass === 'Class III').length,
      },
      averageResponseRate: recalls.length > 0
        ? Math.round(recalls.reduce((sum, r) => sum + r.responseRate, 0) / recalls.length)
        : 0,
    };
  };

  const value = useMemo(() => ({
    recalls,
    notifications,
    responses,
    initiateRecall,
    updateRecall,
    terminateRecall,
    sendRecallNotifications,
    acknowledgeNotification,
    submitRecallResponse,
    getRecallById,
    getRecallsByBatch,
    getActiveRecalls,
    getRecallNotifications,
    getRecallStatistics,
  }), [recalls, notifications, responses]);

  return (
    <RecallContext.Provider value={value}>
      {children}
    </RecallContext.Provider>
  );
}

export function useRecalls() {
  const context = useContext(RecallContext);
  if (!context) {
    throw new Error("useRecalls must be used within RecallProvider");
  }
  return context;
}
