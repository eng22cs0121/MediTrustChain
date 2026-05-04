/**
 * Security Audit Logging Service
 * Logs security-related events for compliance and forensics
 */

type AuditEventType =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed_login'
  | 'auth.role_switch'
  | 'access.granted'
  | 'access.denied'
  | 'access.unauthorized'
  | 'batch.create'
  | 'batch.approve'
  | 'batch.reject'
  | 'batch.recall'
  | 'batch.status_change'
  | 'blockchain.transaction'
  | 'data.export';

interface AuditLogEntry {
  timestamp: string;
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  resource?: string;
  action?: string;
  result: 'success' | 'failure' | 'denied';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

class AuditLogger {
  private static instance: AuditLogger;
  private logs: AuditLogEntry[] = [];
  private readonly MAX_LOGS_IN_MEMORY = 1000;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log a security event
   */
  async log(event: Omit<AuditLogEntry, 'timestamp'>, accessToken?: string): Promise<void> {
    const entry: AuditLogEntry = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS_IN_MEMORY) {
      this.logs.shift(); // Remove oldest entry
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(entry);
    }

    // In production, you would send to:
    // - Database (Supabase audit_logs table)
    // - External logging service (Datadog, Sentry, CloudWatch)
    // - SIEM system for compliance

    try {
      await this.persistToDatabase(entry, accessToken);
    } catch (error) {
      console.error('[AuditLogger] Failed to persist log entry:', error);
    }
  }

  /**
   * Log to console with color coding
   */
  private logToConsole(entry: AuditLogEntry): void {
    const colors = {
      success: '\x1b[32m', // Green
      failure: '\x1b[31m', // Red
      denied: '\x1b[33m', // Yellow
      reset: '\x1b[0m',
    };

    const color = colors[entry.result];
    const prefix = entry.result === 'denied' ? '🔒' : entry.result === 'failure' ? '❌' : '✅';

    console.log(
      `${prefix} [AUDIT] ${color}${entry.eventType}${colors.reset} - ${entry.userEmail || 'unknown'} (${entry.userRole || 'none'}) - ${entry.result}`
    );

    if (entry.metadata) {
      console.log('  Metadata:', entry.metadata);
    }
  }

  /**
   * Persist log entry to database
   */
  private async persistToDatabase(entry: AuditLogEntry, accessToken?: string): Promise<void> {
    try {
      // BYPASS: Raw fetch for high reliability
      if (accessToken) {
        console.log(`🚀 [BYPASS] Persisting audit log ${entry.eventType} via raw fetch...`);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/audit_logs`, {
                method: 'POST',
                headers: {
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    timestamp: entry.timestamp,
                    event_type: entry.eventType,
                    user_id: entry.userId,
                    user_email: entry.userEmail,
                    user_role: entry.userRole,
                    organization_id: entry.metadata?.organization_id || entry.metadata?.organizationId,
                    resource: entry.resource,
                    action: entry.action,
                    result: entry.result,
                    ip_address: entry.ipAddress,
                    user_agent: entry.userAgent,
                    metadata: entry.metadata
                })
            });
            if (response.ok) return;
        } catch (e) {
            console.error("❌ BYPASS Audit failed:", e);
        }
      }

      const { createClient } = await import('../supabase/client');
      const supabase = createClient();

      // Use provided userId and role if available to skip redundant lookups
      let currentUserId = entry.userId;
      let userRole = entry.userRole;
      let organizationId = entry.metadata?.organization_id || entry.metadata?.organizationId;

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        if (!currentUserId) currentUserId = user.id;
        if (!organizationId) organizationId = user.user_metadata?.organization_id;
        if (!userRole) userRole = user.user_metadata?.role || user.user_metadata?.organization_type;
        
        // Final fallback for role
        if (!userRole && organizationId) {
          const { data: stakeholder } = await supabase
            .from('stakeholders')
            .select('role')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();
          
          if (stakeholder) {
            userRole = stakeholder.role;
          }
        }
      }

      // Create AbortController for timeout to prevent infinite hangs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const { error } = await supabase.from('audit_logs').insert({
        timestamp: entry.timestamp,
        event_type: entry.eventType,
        user_id: entry.userId,
        user_email: entry.userEmail,
        user_role: userRole,
        organization_id: organizationId,
        resource: entry.resource,
        action: entry.action,
        result: entry.result,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        metadata: {
          ...entry.metadata,
          organization_id: organizationId,
          role: userRole,
        },
      })
      .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);

      if (error) throw error;
    } catch (error) {
      // Don't throw here to avoid breaking the calling function, 
      // just log the persistence failure.
      console.error('[AuditLogger] Database persistence failed:', error);
    }
  }

  /**
   * Get recent logs (for admin dashboard)
   */
  getRecentLogs(limit: number = 100): AuditLogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Query logs by criteria
   */
  queryLogs(criteria: {
    eventType?: AuditEventType;
    userId?: string;
    result?: 'success' | 'failure' | 'denied';
    startDate?: Date;
    endDate?: Date;
  }): AuditLogEntry[] {
    return this.logs.filter((entry) => {
      if (criteria.eventType && entry.eventType !== criteria.eventType) return false;
      if (criteria.userId && entry.userId !== criteria.userId) return false;
      if (criteria.result && entry.result !== criteria.result) return false;
      if (criteria.startDate && new Date(entry.timestamp) < criteria.startDate) return false;
      if (criteria.endDate && new Date(entry.timestamp) > criteria.endDate) return false;
      return true;
    });
  }

  /**
   * Export logs for compliance reporting
   */
  async exportLogs(format: 'json' | 'csv' = 'json'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else {
      // CSV export
      const headers = ['Timestamp', 'Event Type', 'User Email', 'Role', 'Resource', 'Result'];
      const rows = this.logs.map((entry) => [
        entry.timestamp,
        entry.eventType,
        entry.userEmail || '',
        entry.userRole || '',
        entry.resource || '',
        entry.result,
      ]);

      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Helper functions for common audit events

export async function logLogin(userId: string, email: string, role: string, success: boolean): Promise<void> {
  await auditLogger.log({
    eventType: success ? 'auth.login' : 'auth.failed_login',
    userId,
    userEmail: email,
    userRole: role,
    result: success ? 'success' : 'failure',
  });
}

export async function logLogout(userId: string, email: string, role: string): Promise<void> {
  await auditLogger.log({
    eventType: 'auth.logout',
    userId,
    userEmail: email,
    userRole: role,
    result: 'success',
  });
}

export async function logRoleSwitch(userId: string, email: string, fromRole: string, toRole: string): Promise<void> {
  await auditLogger.log({
    eventType: 'auth.role_switch',
    userId,
    userEmail: email,
    userRole: toRole,
    result: 'success',
    metadata: {
      fromRole,
      toRole,
    },
  });
}

export async function logAccessDenied(
  userId: string | undefined,
  email: string | undefined,
  role: string | undefined,
  resource: string,
  reason?: string
): Promise<void> {
  await auditLogger.log({
    eventType: 'access.denied',
    userId,
    userEmail: email,
    userRole: role,
    resource,
    result: 'denied',
    metadata: { reason },
  });
}

export async function logBatchAction(
  userId: string,
  email: string,
  role: string,
  batchId: string,
  action: 'create' | 'approve' | 'reject' | 'recall' | 'status_change',
  success: boolean,
  metadata?: Record<string, any>
): Promise<void> {
  const eventTypeMap = {
    create: 'batch.create',
    approve: 'batch.approve',
    reject: 'batch.reject',
    recall: 'batch.recall',
    status_change: 'batch.status_change',
  } as const;

  // Get organization_id from metadata if available
  const organizationId = metadata?.organizationId || metadata?.organization_id;

  await auditLogger.log({
    eventType: eventTypeMap[action],
    userId,
    userEmail: email,
    userRole: role,
    resource: `batch/${batchId}`,
    action,
    result: success ? 'success' : 'failure',
    metadata: {
      ...metadata,
      organization_id: organizationId, // Ensure organization_id is in metadata for traceability
      role: role, // Ensure role is in metadata for traceability
    },
  }, metadata?.accessToken); // Extract context token if provided
}

export async function logBlockchainTransaction(
  userId: string,
  email: string,
  role: string,
  txHash: string,
  action: string,
  success: boolean
): Promise<void> {
  await auditLogger.log({
    eventType: 'blockchain.transaction',
    userId,
    userEmail: email,
    userRole: role,
    resource: txHash,
    action,
    result: success ? 'success' : 'failure',
  });
}

export async function logDataExport(
  userId: string,
  email: string,
  role: string,
  exportType: string,
  recordCount: number
): Promise<void> {
  await auditLogger.log({
    eventType: 'data.export',
    userId,
    userEmail: email,
    userRole: role,
    action: exportType,
    result: 'success',
    metadata: { recordCount },
  });
}
