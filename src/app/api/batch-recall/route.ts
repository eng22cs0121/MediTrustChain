import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Uses service role key to bypass RLS and insert notifications for all users
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { batchId, reason } = await req.json();

    if (!batchId || !reason) {
      return NextResponse.json({ error: "Missing batchId or reason" }, { status: 400 });
    }

    // Find all users who are somehow related to this batch.
    // 1. Organization that created it
    // 2. We can notify all pharmacies and distributors just to be safe for a recall
    // Since this is a critical recall, we'll notify ALL stakeholders except the regulator who issued it.

    const { data: stakeholders } = await supabase
      .from("stakeholders")
      .select("user_id, role");

    if (!stakeholders || stakeholders.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const notificationsToInsert = stakeholders.map(sh => ({
      user_id: sh.user_id,
      title: "🚨 URGENT: BATCH RECALL",
      description: `Batch ${batchId} has been recalled by regulatory authority. Reason: ${reason}. STOP ALL DISTRIBUTION AND SALES IMMEDIATELY.`,
      type: "recall",
      read: false
    }));

    const { error } = await supabase
      .from("notifications")
      .insert(notificationsToInsert);

    if (error) {
      console.error("Error inserting recall notifications:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Try to trigger email broadcast if Resend is configured
    try {
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        // For MVP, we send a broadcast email to a verified sender/recipient (due to Resend sandbox limits)
        // In production, this would map over stakeholder emails
        console.log(`[EMAIL BROADCAST STARTED] Recall for ${batchId}`);
        
        await resend.emails.send({
          from: 'MediTrustChain Alerts <alerts@resend.dev>', // Use verified domain in production
          to: ['delivered@resend.dev'], // Send to stakeholders in production
          subject: `🚨 URGENT: BATCH RECALL - ${batchId}`,
          html: `
            <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">URGENT BATCH RECALL</h1>
              </div>
              <div style="padding: 20px;">
                <p style="font-size: 16px; color: #333;">This is an urgent notification from the Regulatory Authority regarding batch <strong>${batchId}</strong>.</p>
                <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; color: #b91c1c;"><strong>Reason for Recall:</strong><br/>${reason}</p>
                </div>
                <p style="font-weight: bold; color: #ef4444;">IMMEDIATE ACTION REQUIRED:</p>
                <ul style="color: #475569;">
                  <li>Stop all distribution of this batch</li>
                  <li>Remove from pharmacy shelves immediately</li>
                  <li>Quarantine any existing stock</li>
                </ul>
                <p style="color: #64748b; font-size: 14px; margin-top: 30px;">This is an automated message from the MediTrustChain system.</p>
              </div>
            </div>
          `
        });
        console.log(`[EMAIL BROADCAST SUCCESS]`);
      }
    } catch (e) {
      console.error("Failed to send email broadcast:", e);
    }

    return NextResponse.json({ 
      success: true, 
      count: notificationsToInsert.length 
    });

  } catch (error: any) {
    console.error("Batch recall API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
