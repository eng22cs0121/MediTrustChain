"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { fetchNotifications, markNotificationRead } from "@/lib/supabase/alerts";
import { useCbacAuth } from "./cbac-auth-context";
import { createClient } from "@/lib/supabase/client";

export type Notification = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
};

interface NotificationsContextType {
  notifications: Notification[];
  isLoading: boolean;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => Promise<void>;
  unreadCount: number;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useCbacAuth();

  // Load notifications from multiple sources
  useEffect(() => {
    async function loadNotifications() {
      setIsLoading(true);
      try {
        // 1. Fetch from Supabase if authenticated
        if (user) {
          const remoteNotifications = await fetchNotifications(user.id);
          if (remoteNotifications && remoteNotifications.length > 0) {
            setNotifications(remoteNotifications.map(n => ({
              id: n.id,
              title: n.title,
              description: n.description,
              timestamp: n.created_at,
              read: n.read,
            })));
            setIsMounted(true);
            return;
          }
        }

        // 2. Fallback to localStorage
        const storedNotifications = localStorage.getItem("meditrust-notifications");
        if (storedNotifications) {
          setNotifications(JSON.parse(storedNotifications));
        }
      } catch (e) {
        // Notifications table optional - silently ignore
      } finally {
        setIsLoading(false);
        setIsMounted(true);
      }
    }

    loadNotifications();

    // 3. Set up Realtime Subscription
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    if (user) {
      const supabase = createClient();
      channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new;
            setNotifications(prev => [{
              id: newNotif.id,
              title: newNotif.title,
              description: newNotif.description,
              timestamp: newNotif.created_at,
              read: newNotif.read,
            }, ...prev]);
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user]);

  // Sync to localStorage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("meditrust-notifications", JSON.stringify(notifications));
    }
  }, [notifications, isMounted]);

  const addNotification = (notificationData: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notificationData,
      id: new Date().getTime().toString(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = async (id: string) => {
    // 1. Update local state
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

    // 2. Sync with Supabase if it's a UUID-style ID (from remote)
    if (user && id.includes('-')) {
      try {
        await markNotificationRead(id);
      } catch (e) {
        console.error("Failed to mark notification as read in Supabase", e);
      }
    }
  }

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const value = useMemo(
    () => ({ notifications, isLoading, addNotification, markAsRead, unreadCount }),
    [notifications, unreadCount, isLoading]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
