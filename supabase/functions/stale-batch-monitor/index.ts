// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current date
    const now = new Date();
    
    // Find batches that are in transit for more than 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: stuckBatches, error } = await supabase
      .from("batches")
      .select("id, name, manufacturer, organization_id, status")
      .eq("status", "In-Transit");
      // In a real app we'd join with history to check WHEN it entered In-Transit
      // For this MVP, we'll fetch all In-Transit and check their last history event

    if (error) throw error;

    console.log(`Found ${stuckBatches?.length || 0} batches in transit`);
    
    let anomaliesCreated = 0;

    for (const batch of stuckBatches || []) {
      // Get the last history event for this batch
      const { data: history } = await supabase
        .from("batch_history")
        .select("timestamp")
        .eq("batch_id", batch.id)
        .order("timestamp", { ascending: false })
        .limit(1);

      if (history && history.length > 0) {
        const lastUpdateStr = history[0].timestamp;
        // Parse date string securely, handling different formats
        let lastUpdate;
        if (lastUpdateStr.includes('T')) {
          lastUpdate = new Date(lastUpdateStr);
        } else {
          // If it's something like "02-05-2026 18:45"
          // We'd parse it, but standard JS Date might fail.
          // Let's assume standard ISO format for MVP
          lastUpdate = new Date(lastUpdateStr);
        }

        if (isNaN(lastUpdate.getTime())) {
          console.error(`Invalid timestamp for batch ${batch.id}: ${lastUpdateStr}`);
          continue;
        }

        const daysStuck = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysStuck > 7) {
          console.log(`Batch ${batch.id} stuck for ${daysStuck} days. Creating anomaly...`);
          
          // Check if we already have an open anomaly for this
          const { data: existingAnomaly } = await supabase
            .from("anomaly_results")
            .select("id")
            .eq("batch_id", batch.id)
            .contains("anomaly_types", ["time_delay"])
            .eq("status", "open");

          if (!existingAnomaly || existingAnomaly.length === 0) {
            // Create anomaly
            await supabase.from("anomaly_results").insert({
              batch_id: batch.id,
              anomaly_types: ["time_delay"],
              severity: "high",
              description: `Batch has been stuck in 'In-Transit' for ${daysStuck} days without any location updates.`,
              reasons: [`No updates since ${lastUpdateStr}`],
              status: "open",
              title: "Prolonged Transit Delay"
            });
            anomaliesCreated++;

            // Also flag the batch
            await supabase.from("batches").update({
               status: "Flagged",
               anomaly_reason: `Stale batch: stuck in transit for ${daysStuck} days.`
            }).eq("id", batch.id);

            // Send notification to regulators
            const { data: regulators } = await supabase
              .from("stakeholders")
              .select("user_id")
              .eq("role", "regulator");

            if (regulators && regulators.length > 0) {
              const notifications = regulators.map(r => ({
                user_id: r.user_id,
                title: "⚠️ Stale Batch Detected",
                description: `Batch ${batch.id} has been flagged for prolonged transit delay (${daysStuck} days).`,
                type: "alert"
              }));
              await supabase.from("notifications").insert(notifications);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, anomaliesCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error monitoring stale batches:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
