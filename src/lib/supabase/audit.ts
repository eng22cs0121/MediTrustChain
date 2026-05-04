import { createClient } from './client';

export type AuditLogEntry = {
    id: string;
    timestamp: string;
    event_type: string;
    user_id?: string;
    user_email?: string;
    user_role?: string;
    organization_id?: string; // Organization ID for traceability
    resource?: string;
    action?: string;
    result: 'success' | 'failure' | 'denied';
    ip_address?: string;
    user_agent?: string;
    metadata?: any;
};

export async function fetchAuditLogs(limit: number = 50, offset: number = 0) {
    const supabase = createClient();

    const { data, error, count } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        // Audit logs table optional - silently ignore
        throw error;
    }

    return { logs: data as AuditLogEntry[], total: count || 0 };
}

export async function fetchUserStats() {
    const supabase = createClient();

    try {
        // Fetch all organization types
        const { data: orgs, error: orgError } = await supabase
            .from('organizations')
            .select('organization_type, is_active');

        if (orgError) throw orgError;

        // Fetch admin users
        const { data: admins, error: adminError } = await supabase
            .from('admin_users')
            .select('id, is_active');

        if (adminError) throw adminError;

        // Fetch stakeholders
        const { data: stakeholders, error: stakeholderError } = await supabase
            .from('stakeholders')
            .select('id, is_active');

        if (stakeholderError) throw stakeholderError;

        // Build stats from actual tables
        const stats: any = {
            total: 0,
            admin: admins?.filter(a => a.is_active).length || 0,
            stakeholder: stakeholders?.filter(s => s.is_active).length || 0,
            manufacturer: 0,
            distributor: 0,
            regulator: 0,
            logistics: 0,
            pharmacy: 0
        };

        // Count active organizations by type
        orgs?.forEach((org: any) => {
            if (org.is_active && org.organization_type) {
                stats[org.organization_type] = (stats[org.organization_type] || 0) + 1;
            }
        });

        // Calculate total
        stats.total = stats.admin + stats.stakeholder + 
                      stats.manufacturer + stats.distributor + 
                      stats.regulator + stats.logistics + stats.pharmacy;

        return stats;
    } catch (error: any) {
        // Better error logging
        const errorDetails = error?.message || error?.code || error?.hint || JSON.stringify(error);
        console.error('Error fetching user stats:', errorDetails, error);
        
        // Return empty stats instead of throwing
        return {
            total: 0,
            admin: 0,
            stakeholder: 0,
            manufacturer: 0,
            distributor: 0,
            regulator: 0,
            logistics: 0,
            pharmacy: 0
        };
    }
}
