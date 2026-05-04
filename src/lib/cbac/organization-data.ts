/**
 * ORGANIZATION-SCOPED DATA ACCESS LIBRARY
 * Functions for organizations to manage their batches and supply chain
 */

import { createClient } from '@/lib/supabase/client';
import type {
  Batch,
  SupplyChainEvent,
  OrganizationType,
} from '@/types/cbac';

/**
 * Get organization info from stakeholder
 */
export async function getOrganizationFromStakeholder(): Promise<{
  success: boolean;
  organizationId?: string;
  organizationType?: OrganizationType;
  stakeholderRole?: string;
  error?: string;
}> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get stakeholder from user_id
    const { data: stakeholder, error } = await supabase
      .from('stakeholders')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !stakeholder) {
      return { success: false, error: 'Stakeholder not found' };
    }

    const org = stakeholder.organization as any;
    
    return {
      success: true,
      organizationId: org.id,
      organizationType: org.organization_type,
      stakeholderRole: stakeholder.role,
    };
  } catch (error) {
    console.error('Error getting organization from stakeholder:', error);
    return { success: false, error: 'Failed to get organization' };
  }
}

/**
 * Create a new batch (Manufacturer only)
 * Enforces organization-level data isolation and role-based access control
 */
export async function createBatch(batchData: {
  batch_number: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  unit?: string;
  manufacturing_date: string;
  expiry_date: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; batch?: Batch; error?: string }> {
  try {
    const supabase = createClient();
    
    // Get organization info from stakeholder
    const orgInfo = await getOrganizationFromStakeholder();
    if (!orgInfo.success || !orgInfo.organizationId) {
      return { success: false, error: orgInfo.error || 'Organization not found' };
    }

    // SECURE ACCESS ENFORCEMENT: Check if stakeholder role is manufacturer
    if (orgInfo.stakeholderRole !== 'manufacturer') {
      return { success: false, error: 'Only stakeholders with manufacturer role can create batches' };
    }

    // ORGANIZATION ISOLATION: Ensure batch is created for user's organization
    const batchOrganizationId = batchData.metadata?.organization_id || orgInfo.organizationId;
    if (batchOrganizationId !== orgInfo.organizationId) {
      return { success: false, error: 'Cannot create batch for a different organization' };
    }

    // Create batch
    const { data: batch, error } = await supabase
      .from('batches')
      .insert({
        ...batchData,
        organization_id: orgInfo.organizationId,
        current_holder_id: orgInfo.organizationId,
        status: 'manufactured',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Create supply chain event with organization metadata
    await supabase.from('supply_chain_events').insert({
      batch_id: batch.id,
      event_type: 'manufactured',
      organization_id: orgInfo.organizationId, // CRITICAL: Organization isolation
      location: batchData.metadata?.location || 'Manufacturing facility',
    });

    // Log audit event with organization and role metadata for traceability
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { logBatchAction } = await import('@/lib/audit/logger');
      await logBatchAction(
        user.id,
        user.email || 'unknown',
        orgInfo.organizationType || 'manufacturer',
        batch.id,
        'create',
        true,
        {
          batch_number: batchData.batch_number,
          product_name: batchData.product_name,
          quantity: batchData.quantity,
          organizationId: orgInfo.organizationId,
        }
      );
    }

    return { success: true, batch: batch as Batch };
  } catch (error) {
    console.error('Error creating batch:', error);
    return { success: false, error: 'Failed to create batch' };
  }
}

/**
 * Get batches for the organization
 */
export async function getOrganizationBatches(): Promise<{
  success: boolean;
  batches?: Batch[];
  error?: string;
}> {
  try {
    const supabase = createClient();
    
    // Get organization info
    const orgInfo = await getOrganizationFromStakeholder();
    if (!orgInfo.success || !orgInfo.organizationId) {
      return { success: false, error: orgInfo.error || 'Organization not found' };
    }

    // Get batches owned by or currently held by the organization
    const { data: batches, error } = await supabase
      .from('batches')
      .select('*')
      .or(`organization_id.eq.${orgInfo.organizationId},current_holder_id.eq.${orgInfo.organizationId}`)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, batches: batches as Batch[] };
  } catch (error) {
    console.error('Error getting batches:', error);
    return { success: false, error: 'Failed to get batches' };
  }
}

/**
 * Get a specific batch
 */
export async function getBatch(batchId: string): Promise<{
  success: boolean;
  batch?: Batch;
  error?: string;
}> {
  try {
    const supabase = createClient();
    
    // Get batch
    const { data: batch, error } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, batch: batch as Batch };
  } catch (error) {
    console.error('Error getting batch:', error);
    return { success: false, error: 'Failed to get batch' };
  }
}

/**
 * Ship a batch to another organization
 */
export async function shipBatch(
  batchId: string,
  toOrganizationId: string,
  location?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    
    // Get organization info
    const orgInfo = await getOrganizationFromStakeholder();
    if (!orgInfo.success || !orgInfo.organizationId) {
      return { success: false, error: orgInfo.error || 'Organization not found' };
    }

    // Update batch status
    const { error: updateError } = await supabase
      .from('batches')
      .update({
        status: 'in_transit',
        current_location: location || 'In transit',
      })
      .eq('id', batchId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Create supply chain event
    const { error: eventError } = await supabase
      .from('supply_chain_events')
      .insert({
        batch_id: batchId,
        event_type: 'shipped',
        organization_id: orgInfo.organizationId,
        from_organization_id: orgInfo.organizationId,
        to_organization_id: toOrganizationId,
        location: location,
        notes: notes,
      });

    if (eventError) {
      return { success: false, error: eventError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error shipping batch:', error);
    return { success: false, error: 'Failed to ship batch' };
  }
}

/**
 * Receive a batch
 */
export async function receiveBatch(
  batchId: string,
  fromOrganizationId: string,
  location?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    
    // Get organization info
    const orgInfo = await getOrganizationFromStakeholder();
    if (!orgInfo.success || !orgInfo.organizationId) {
      return { success: false, error: orgInfo.error || 'Organization not found' };
    }

    // Update batch
    const { error: updateError } = await supabase
      .from('batches')
      .update({
        status: 'received',
        current_holder_id: orgInfo.organizationId,
        current_location: location || 'Warehouse',
      })
      .eq('id', batchId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Create supply chain event
    const { error: eventError } = await supabase
      .from('supply_chain_events')
      .insert({
        batch_id: batchId,
        event_type: 'received',
        organization_id: orgInfo.organizationId,
        from_organization_id: fromOrganizationId,
        to_organization_id: orgInfo.organizationId,
        location: location,
        notes: notes,
      });

    if (eventError) {
      return { success: false, error: eventError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error receiving batch:', error);
    return { success: false, error: 'Failed to receive batch' };
  }
}

/**
 * Get supply chain events for a batch
 */
export async function getBatchSupplyChainEvents(batchId: string): Promise<{
  success: boolean;
  events?: SupplyChainEvent[];
  error?: string;
}> {
  try {
    const supabase = createClient();
    
    // Get events
    const { data: events, error } = await supabase
      .from('supply_chain_events')
      .select(`
        *,
        organization:organizations!supply_chain_events_organization_id_fkey(*),
        from_organization:organizations!supply_chain_events_from_organization_id_fkey(*),
        to_organization:organizations!supply_chain_events_to_organization_id_fkey(*)
      `)
      .eq('batch_id', batchId)
      .order('timestamp', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, events: events as any };
  } catch (error) {
    console.error('Error getting supply chain events:', error);
    return { success: false, error: 'Failed to get supply chain events' };
  }
}

/**
 * Distribute batch (Distributor only)
 */
export async function distributeBatch(
  batchId: string,
  toOrganizationId: string,
  quantity: number,
  location?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    
    // Get organization info
    const orgInfo = await getOrganizationFromStakeholder();
    if (!orgInfo.success || !orgInfo.organizationId) {
      return { success: false, error: orgInfo.error || 'Organization not found' };
    }

    if (orgInfo.organizationType !== 'distributor') {
      return { success: false, error: 'Only distributors can distribute batches' };
    }

    // Update batch
    const { error: updateError } = await supabase
      .from('batches')
      .update({
        status: 'distributed',
        current_holder_id: toOrganizationId,
        current_location: location || 'Distributed',
      })
      .eq('id', batchId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Create supply chain event
    const { error: eventError } = await supabase
      .from('supply_chain_events')
      .insert({
        batch_id: batchId,
        event_type: 'distributed',
        organization_id: orgInfo.organizationId,
        from_organization_id: orgInfo.organizationId,
        to_organization_id: toOrganizationId,
        location: location,
        notes: notes,
        metadata: { quantity },
      });

    if (eventError) {
      return { success: false, error: eventError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error distributing batch:', error);
    return { success: false, error: 'Failed to distribute batch' };
  }
}

/**
 * Dispense batch (Pharmacy only)
 */
export async function dispenseBatch(
  batchId: string,
  quantity: number,
  location?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    
    // Get organization info
    const orgInfo = await getOrganizationFromStakeholder();
    if (!orgInfo.success || !orgInfo.organizationId) {
      return { success: false, error: orgInfo.error || 'Organization not found' };
    }

    if (orgInfo.organizationType !== 'pharmacy') {
      return { success: false, error: 'Only pharmacies can dispense batches' };
    }

    // Update batch
    const { error: updateError } = await supabase
      .from('batches')
      .update({
        status: 'dispensed',
        current_location: location || 'Dispensed',
      })
      .eq('id', batchId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Create supply chain event
    const { error: eventError } = await supabase
      .from('supply_chain_events')
      .insert({
        batch_id: batchId,
        event_type: 'dispensed',
        organization_id: orgInfo.organizationId,
        location: location,
        notes: notes,
        metadata: { quantity },
      });

    if (eventError) {
      return { success: false, error: eventError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error dispensing batch:', error);
    return { success: false, error: 'Failed to dispense batch' };
  }
}
