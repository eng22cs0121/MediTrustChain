"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { checkForAnomalies } from "@/ai/flows/anomaly-detection-flow";
import { useNotifications } from "./notifications-context";
import { fetchBatches, upsertBatch, addBatchHistory, updateBatchStatusInDb } from "@/lib/supabase/batches";
import { saveAnomaly, notifyRegulators } from "@/lib/supabase/alerts";
import { useCbacAuth } from "./cbac-auth-context";
import { createClient } from "@/lib/supabase/client";
import { logBatchAction } from "@/lib/audit/logger";
import { getUserIdentity } from "@/lib/cbac/access-control";

// Batch status type matching V2 strict state machine:
// Pending → Approved → In-Transit → At-Pharmacy → Sold
export type BatchStatus = "Pending" | "Approved" | "Rejected" | "In-Transit" | "At-Pharmacy" | "Sold" | "Expired" | "Recalled" | "Flagged" | "Delivered" | "Blocked";

export type BatchHistoryEvent = {
  location: string;
  timestamp: string;
  status: BatchStatus;
  latitude?: number;
  longitude?: number;
};

export type Batch = {
  id: string;
  name: string;
  mfg: string;
  exp: string;
  qty: number;
  status: BatchStatus;
  manufacturer?: string;
  organization_id?: string; // For data isolation validation
  history: BatchHistoryEvent[];
  anomalyReason?: string;
  // V2: On-chain data hash computed at creation (IMMUTABLE)
  dataHash?: string;
  // Blockchain sync fields
  blockchain_tx_hash?: string;
  on_chain_batch_id?: number;
  is_blockchain_synced?: boolean;
  // Drug Master fields (from regulator-approved template)
  drug_master_id?: string;
  composition_hash?: string;
  composition?: string;
  strength?: string;
};

const initialBatches: Batch[] = [];

interface BatchesContextType {
  batches: Batch[];
  isLoading: boolean;
  addBatch: (batch: Omit<Batch, "status" | "history">) => Promise<Batch>;
  updateBatchStatus: (batchId: string, status: BatchStatus, location?: string, anomalyReason?: string, txnHash?: string, latitude?: number, longitude?: number) => Promise<Batch | undefined>;
  updateBatchLocation: (batchId: string, location: string, txnHash?: string, latitude?: number, longitude?: number) => Promise<Batch | undefined>;
  updateBatchDetails: (batchId: string, updates: Partial<Pick<Batch, "name" | "qty" | "mfg" | "exp">>) => Promise<Batch | undefined>;
}

const BatchesContext = createContext<BatchesContextType | undefined>(undefined);

export function BatchesProvider({ children }: { children: ReactNode }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const notifications = useNotifications();
  const { user, session, organization } = useCbacAuth();
  const supabase = createClient();

  // Initial data load — Supabase is the SOLE source of truth
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        console.log("🔄 Fetching batches from Supabase...");
        
        const remoteBatches = await fetchBatches();
        console.log("📦 Fetched batches from database:", remoteBatches?.length || 0);

        let validatedBatches = remoteBatches || [];

        if (user) {
          console.log("👤 User ID:", user.id);
          console.log("📍 User org_id from metadata:", user.user_metadata?.organization_id);

          const userOrgId = user.user_metadata?.organization_id;

          const supabase = createClient();
          const { data: adminUser } = await supabase
            .from('admin_users')
            .select('id')
            .eq('id', user.id)
            .eq('is_active', true)
            .maybeSingle();

          const isAdmin = !!adminUser;
          console.log("👑 Is admin:", isAdmin);

          if (!isAdmin && userOrgId) {
            validatedBatches = validatedBatches.filter(batch => {
              if (!batch.organization_id) return true;
              return batch.organization_id === userOrgId;
            });
            console.log(`🔒 Filtered to ${validatedBatches.length} batches for org ${userOrgId}`);
          }
        } else {
          console.log("🌐 Public user fetching unauthenticated batches");
        }

        setBatches(validatedBatches);
      } catch (error) {
        console.error("Failed to load batches:", error);
        notifications.addNotification({
          title: "Load Error",
          description: "Failed to load batches from database",
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (isMounted) {
      loadInitialData();
    }
  }, [user, isMounted, notifications]); // Removed supabase dependency to prevent re-runs

  // Real-time updates subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('batches_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batches',
        },
        (payload) => {
          console.log('🔔 Real-time update:', payload);
          // Refresh data on change
          if (payload.eventType === 'INSERT') {
            // We could append locally, but fetching ensures we get full history etc if needed
            // For now, let's just append the new record if it matches our org
            const newRecord = payload.new as any; // Cast to avoid type issues with raw payload
            // Basic transformation
            const newBatch: Batch = {
              id: newRecord.id,
              name: newRecord.name,
              mfg: newRecord.mfg,
              exp: newRecord.exp,
              qty: newRecord.qty,
              status: newRecord.status,
              manufacturer: newRecord.manufacturer,
              organization_id: newRecord.organization_id,
              history: [], // History comes separately
              anomalyReason: newRecord.anomaly_reason,
              dataHash: newRecord.data_hash
            };
            setBatches(current => [newBatch, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setBatches(current => current.map(b =>
              b.id === payload.new.id ? { ...b, ...payload.new as any } : b
            ));
          } else if (payload.eventType === 'DELETE') {
            setBatches(current => current.filter(b => b.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const addBatch = async (newBatchData: Omit<Batch, "status" | "history">) => {
    if (!user) throw new Error("User must be logged in to create a batch");

    console.log("🔄 addBatch called with:", newBatchData);

    // Get user identity (role, organization, etc.)
    // Use fast path from metadata if available to avoid async heavy lifting
    const userMetadata = user.user_metadata;
    let userIdentity;

    if (userMetadata?.organization_id && userMetadata?.role) {
      console.log("✅ Using user metadata for identity (fast path):", {
        organizationId: userMetadata.organization_id,
        isAdmin: userMetadata.is_admin,
        role: userMetadata.role
      });
      userIdentity = {
        organizationId: userMetadata.organization_id,
        organizationName: userMetadata.organization_name,
        role: userMetadata.role,
        isAdmin: !!userMetadata.is_admin
      };
    } else {
      console.log("⚠️ Metadata missing, fetching identity from DB (slow path)...");
      userIdentity = await getUserIdentity();
    }

    // STRICT Security Check: Ensure user belongs to the organization they are creating for
    if (newBatchData.organization_id && newBatchData.organization_id !== userIdentity.organizationId && !userIdentity.isAdmin) {
      console.error("❌ Organization mismatch:", {
        request: newBatchData.organization_id,
        user: userIdentity.organizationId
      });
      throw new Error('Cannot create batch for different organization');
    }

    const historyEvent: BatchHistoryEvent = {
      location: newBatchData.manufacturer || "Unknown Manufacturer",
      timestamp: new Date().toISOString(),
      status: "Pending"
    };

    // Use user's organization_id for data isolation
    const organizationId = newBatchData.organization_id || userIdentity.organizationId;

    const newBatch: Batch = {
      ...newBatchData,
      organization_id: organizationId, // CRITICAL: Set organization_id for data isolation
      status: "Pending",
      history: [historyEvent]
    };

    // OPTIMIZATION: Use session from context (synchronous) instead of getSession() (async/hanging)
    const token = session?.access_token;
    if (!token) console.warn("⚠️ No access token found in session context, upsertBatch might fail");

    console.log("✅ New batch object created:", newBatch);

    // 1. CRITICAL: Persist to Supabase FIRST (blocking) — this is the source of truth
    try {
      await upsertBatch(newBatch, user.id, token);
      console.log("✅ Batch saved to database with organization_id:", organizationId);
    } catch (error) {
      console.error("❌ Failed to save batch to database:", error);
      throw new Error(`Failed to save batch: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 2. Update local state AFTER successful DB write
    setBatches(prevBatches => [newBatch, ...prevBatches]);
    console.log("✅ Local state updated");

    // 3. Persist history and audit log in background (non-critical)
    try {
      // Add initial history record
      addBatchHistory(newBatch.id, historyEvent, user.id).catch(err =>
        console.warn("Background history save failed:", err)
      );

      // Log audit action
      logBatchAction(
        user.id,
        user.email || '',
        userIdentity.role || '',
        newBatch.id,
        'create',
        true,
        { organization_id: organizationId, accessToken: token }
      ).catch(err => console.warn("Background audit log failed:", err));

      // 4. Verify AI compliance checks (async)
      checkForAnomalies({ batch: newBatch }).then(result => {
        const anomalies = result.anomalies;
        if (anomalies.length > 0) {
          console.warn(`⚠️ ${anomalies.length} anomalies detected for batch ${newBatch.id}`);

          // Save anomalies to database
          anomalies.forEach((anomaly: any) => {
            saveAnomaly({
              batchId: newBatch.id,
              severity: anomaly.severity,
              description: anomaly.description,
              detectedAt: new Date().toISOString(),
              is_resolved: false
            } as any, token).catch((e: any) => console.error("Failed to save anomaly:", e));
          });

          // Notify regulators if needed
          notifyRegulators(
            `Anomaly Detected: Batch ${newBatch.id}`,
            `${anomalies.length} anomalies found. Highest severity: ${anomalies[0]?.severity}`,
            newBatch.id,
            undefined,
            token
          ).catch((e: any) =>
            console.error("Failed to notify regulators:", e)
          );
        }
      });
    } catch (error) {
      // Non-blocking errors
      console.warn("⚠️ Non-critical background task failed:", error);
    }

    return newBatch;
  };

  const updateBatchStatus = async (
    batchId: string,
    status: BatchStatus,
    location: string = "Unknown Location",
    anomalyReason?: string,
    txnHash?: string,
    latitude?: number,
    longitude?: number
  ) => {
    if (!user) throw new Error("User must be logged in to update batch status");

    const historyEvent: BatchHistoryEvent = {
      location,
      timestamp: new Date().toISOString(),
      status,
      latitude,
      longitude
    };

    // Optimistic update locally
    const originalBatches = [...batches];
    setBatches(prevBatches =>
      prevBatches.map(batch =>
        batch.id === batchId
          ? {
            ...batch,
            status,
            history: [...batch.history, historyEvent],
            anomalyReason,
            blockchain_tx_hash: txnHash || batch.blockchain_tx_hash,
            is_blockchain_synced: txnHash ? true : batch.is_blockchain_synced
          }
          : batch
      )
    );

    try {
      // 1. Update status in DB (using unrestricted function for supply chain) - NON-BLOCKING
      // Pass user.id to avoid redundant lookups
      // Pass token for high-reliability fetch bypass
      const token = session?.access_token;
      updateBatchStatusInDb(batchId, status, location, anomalyReason, user.id, "SUPPLY CHAIN", txnHash, token).catch(err =>
        console.warn("Background DB sync failed:", err)
      );

      // 2. Add history record (NON-BLOCKING)
      addBatchHistory(batchId, historyEvent, user.id, token).catch(err => 
        console.warn("Background history save failed:", err)
      );

      // 3. Log audit (NON-BLOCKING)
      logBatchAction(
        user.id,
        user.email || '',
        '',
        batchId,
        'status_change',
        true,
        { newStatus: status, location, accessToken: token }
      ).catch(err => console.warn("Background audit log failed:", err));

      // 4. Trigger AI anomaly scan on this batch (NON-BLOCKING, runs in background)
      const updatedBatch = batches.find(b => b.id === batchId);
      if (updatedBatch) {
        checkForAnomalies({
          batch: {
            id: updatedBatch.id, name: updatedBatch.name, mfg: updatedBatch.mfg,
            exp: updatedBatch.exp, qty: updatedBatch.qty, status,
            manufacturer: updatedBatch.manufacturer,
            history: [...updatedBatch.history, historyEvent],
          },
          currentDate: new Date().toISOString(),
        }).then(result => {
          if (result.isAnomaly && result.anomalies.length > 0) {
            console.warn(`⚠️ [Real-time AI] ${result.anomalies.length} anomalies on ${batchId} after status update. Risk: ${result.overallRiskScore}%`);
            result.anomalies.forEach((anomaly: any) => {
              saveAnomaly({
                batchId, severity: anomaly.severity,
                description: anomaly.description,
                detectedAt: new Date().toISOString(),
                is_resolved: false,
              } as any, session?.access_token).catch(() => {});
            });
          }
        }).catch(() => {});
      }

      return batches.find(b => b.id === batchId);
    } catch (error) {
      console.error("Failed to update status in DB:", error);
      setBatches(originalBatches);
      notifications.addNotification({ title: "Update Error", description: "Failed to update batch status" });
      return undefined;
    }
  };

  const updateBatchLocation = async (batchId: string, location: string, txnHash?: string, latitude?: number, longitude?: number) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return undefined;

    // Logic: If the batch is Approved, the first location update (by Distributor) 
    // transitions it to In-Transit both locally and in the database.
    const newStatus = batch.status === "Approved" ? "In-Transit" : batch.status;

    return updateBatchStatus(batchId, newStatus, location, undefined, txnHash, latitude, longitude);
  };

  const updateBatchDetails = async (batchId: string, updates: Partial<Pick<Batch, "name" | "qty" | "mfg" | "exp">>) => {
    if (!user) throw new Error("User must be logged in to update batch details");
    
    const batch = batches.find(b => b.id === batchId);
    if (!batch || batch.status !== "Pending") return undefined;

    // Optimistic update locally
    const originalBatches = [...batches];
    setBatches(prevBatches =>
      prevBatches.map(b => (b.id === batchId ? { ...b, ...updates } : b))
    );

    try {
      const { updateBatchData } = await import("@/lib/supabase/batches");
      await updateBatchData(batchId, updates);
      
      logBatchAction(
        user.id,
        user.email || '',
        '',
        batchId,
        'status_change',
        true,
        { updates }
      ).catch(err => console.warn("Background audit log failed:", err));

      return { ...batch, ...updates };
    } catch (error) {
      console.error("Failed to update batch details in DB:", error);
      setBatches(originalBatches);
      notifications.addNotification({ title: "Update Error", description: "Failed to update batch details" });
      return undefined;
    }
  };

  const value = useMemo(
    () => ({
      batches,
      isLoading,
      addBatch,
      updateBatchStatus,
      updateBatchLocation,
      updateBatchDetails,
    }),
    [batches, isLoading, user]
  );

  return <BatchesContext.Provider value={value}>{children}</BatchesContext.Provider>;
}

export function useBatches() {
  const context = useContext(BatchesContext);
  if (context === undefined) {
    throw new Error("useBatches must be used within a BatchesProvider");
  }
  return context;
}
