"use server";

import { createClient } from "@/lib/supabase/server";

export async function fetchAnomalies() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("anomaly_results")
    .select(`
      *,
      batches (
        id,
        name,
        manufacturer,
        exp,
        status
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching anomalies:", error);
    return [];
  }

  return data;
}

export async function updateAnomalyStatus(id: string, status: string, reviewNotes: string, reviewerId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("anomaly_results")
    .update({
      status,
      review_notes: reviewNotes,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating anomaly:", error);
    throw error;
  }

  return data;
}
