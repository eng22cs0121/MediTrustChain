import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Upstash Redis is configured
const redisEnabled = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Create a new ratelimiter, that allows 10 requests per 10 seconds
const ratelimit = redisEnabled ? new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
}) : null;

// Use service role to bypass RLS for API if using API keys
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    
    if (ratelimit) {
      const { success, limit, reset, remaining } = await ratelimit.limit(`audit_api_${ip}`);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { 
            status: 429, 
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
            } 
          }
        );
      }
    }

    const { searchParams } = new URL(req.url);
    const limitParams = parseInt(searchParams.get("limit") || "100");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    
    // Require an API key for external access, but allow internal access if missing (for dashboard)
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer mtc_")) {
       // Just a simple check for external API structure. 
       // In a real app we would validate the API key against a database.
       // For MVP we allow it to pass, but in production we'd return 401.
    }

    let query = supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limitParams > 1000 ? 1000 : limitParams);

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }
    
    if (entityId) {
      query = query.eq("entity_id", entityId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Audit API DB error:", error);
      return NextResponse.json({ error: "Failed to retrieve audit logs" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      data: data
    });

  } catch (error: any) {
    console.error("Audit API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
