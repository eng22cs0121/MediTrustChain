/**
 * HIERARCHICAL ORGANIZATION & STAKEHOLDER TYPES
 * Organizations (parent) → Stakeholders (child)
 * Organizations: No email, no password, no wallet
 * Stakeholders: Email, password, wallet, role
 */

// Organization Types (roles that stakeholders can have)
export type OrganizationType =
  | 'manufacturer'
  | 'distributor'
  | 'regulator'
  | 'pharmacy'
  | 'logistics';

// Stakeholder Role (matches OrganizationType)
export type StakeholderRole =
  | 'manufacturer'
  | 'distributor'
  | 'regulator'
  | 'pharmacy'
  | 'logistics';

// Organization Interface (Parent Entity)
// NO email, NO password, NO wallet at organization level
export interface Organization {
  id: string;
  name: string;
  organization_type: OrganizationType;
  registration_number: string;
  phone?: string;
  address?: string;
  country?: string;
  created_at: string;
  updated_at: string;
  created_by: string; // Admin user ID
  is_active: boolean;
  verification_documents?: Record<string, any>[];
}

// Stakeholder Interface (Child Entity)
// Each stakeholder has email, password (via Supabase Auth), wallet, and role
export interface Stakeholder {
  id: string;
  organization_id: string; // Parent organization
  full_name: string;
  email: string; // Unique, used for authentication
  phone?: string;
  position?: string;
  user_id?: string; // Reference to Supabase Auth user
  wallet_address: string; // Blockchain wallet address (unique, required)
  role: StakeholderRole; // Role: manufacturer, distributor, regulator, pharmacy, logistics
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string; // Admin user ID
  notes?: string;
  metadata?: Record<string, any>;
}

// Stakeholder with Organization Details
export interface StakeholderWithDetails extends Stakeholder {
  organization_name?: string;
  organization_type?: OrganizationType;
}

// Permissions (based on stakeholder role)
export interface StakeholderPermissions {
  // Batch operations
  can_create_batches?: boolean;
  can_read_batches?: boolean;
  can_update_batches?: boolean;
  can_delete_batches?: boolean;

  // Supply chain operations
  can_ship_batches?: boolean;
  can_receive_batches?: boolean;
  can_distribute_batches?: boolean;
  can_dispense_batches?: boolean;

  // Regulatory operations
  can_approve_batches?: boolean;
  can_reject_batches?: boolean;
  can_recall_batches?: boolean;

  // Reporting
  can_view_analytics?: boolean;
  can_export_data?: boolean;

  // Additional permissions
  [key: string]: boolean | undefined;
}

// Batch Interface (Organization-scoped)
export interface Batch {
  id: string;
  batch_number: string;
  organization_id: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  unit: string;
  manufacturing_date: string;
  expiry_date: string;
  blockchain_hash?: string;
  blockchain_timestamp?: string;
  status: string;
  current_location?: string;
  current_holder_id?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

// Supply Chain Event Interface
export interface SupplyChainEvent {
  id: string;
  batch_id: string;
  event_type: 'manufactured' | 'shipped' | 'received' | 'distributed' | 'dispensed' | 'recalled';
  organization_id: string;
  from_organization_id?: string;
  to_organization_id?: string;
  location?: string;
  blockchain_hash?: string;
  blockchain_timestamp?: string;
  timestamp: string;
  notes?: string;
  metadata?: Record<string, any>;
  verified_by?: string;
  verification_signature?: string;
}

// Admin User Interface (Project Owner)
export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  last_active?: string;
  can_manage_organizations: boolean;
  can_manage_stakeholders: boolean;
  is_active: boolean;
}

// Organization Registration Request (NO email, NO password, NO wallet)
export interface OrganizationRegistrationRequest {
  name: string;
  organization_type: OrganizationType;
  registration_number: string;
  phone?: string;
  address?: string;
  country?: string;
  verification_documents?: Record<string, any>[];
}

// Stakeholder Creation Request
export interface StakeholderCreationRequest {
  organization_id: string; // Parent organization
  full_name: string;
  email: string; // Required: Email for authentication
  password: string; // Required: Password (will be hashed by Supabase Auth)
  wallet_address: string; // Required: Blockchain wallet address (must be unique)
  role: StakeholderRole; // Required: Role for this stakeholder
  phone?: string;
  position?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

// Stakeholder Update Request
export interface StakeholderUpdateRequest {
  full_name?: string;
  phone?: string;
  position?: string;
  notes?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
  email?: string;
  password?: string;
  wallet_address?: string;
  role?: StakeholderRole;
}

// Default permissions by stakeholder role
export const DEFAULT_PERMISSIONS: Record<StakeholderRole, StakeholderPermissions> = {
  manufacturer: {
    can_create_batches: true,
    can_read_batches: true,
    can_update_batches: true,
    can_ship_batches: true,
    can_view_analytics: true,
    can_export_data: true,
  },
  distributor: {
    can_read_batches: true,
    can_receive_batches: true,
    can_ship_batches: true,
    can_distribute_batches: true,
    can_view_analytics: true,
  },
  logistics: {
    can_read_batches: true,
    can_receive_batches: true,
    can_ship_batches: true,
    can_view_analytics: false,
  },
  pharmacy: {
    can_read_batches: true,
    can_receive_batches: true,
    can_dispense_batches: true,
    can_view_analytics: false,
  },
  regulator: {
    can_read_batches: true,
    can_approve_batches: true,
    can_reject_batches: true,
    can_recall_batches: true,
    can_view_analytics: true,
    can_export_data: true,
  },
};

// =====================================================
// CBAC (Claims-Based Access Control) Types
// =====================================================

/**
 * CBAC Permission record from database
 * Stores fine-grained permissions per stakeholder per organization
 */
export interface CBACPermission {
  id: string;
  stakeholder_id: string;
  organization_id: string;
  
  // Core permission flags
  can_create_batches: boolean;
  can_approve_batches: boolean;
  can_reject_batches: boolean;
  can_recall_batches: boolean;
  can_update_status: boolean;
  can_view_all_batches: boolean;
  can_view_analytics: boolean;
  can_export_data: boolean;
  can_manage_stakeholders: boolean;
  
  // Extensible custom permissions
  custom_permissions?: Record<string, boolean>;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * Role template for default permissions
 */
export interface OrganizationRoleTemplate {
  id: string;
  organization_id: string | null; // null = global template
  role_name: StakeholderRole;
  
  // Default permissions for this role
  can_create_batches: boolean;
  can_approve_batches: boolean;
  can_reject_batches: boolean;
  can_recall_batches: boolean;
  can_update_status: boolean;
  can_view_all_batches: boolean;
  can_view_analytics: boolean;
  can_export_data: boolean;
  can_manage_stakeholders: boolean;
  
  created_at: string;
  updated_at: string;
}

/**
 * Organization summary view with counts
 */
export interface OrganizationSummary {
  id: string;
  name: string;
  organization_type: OrganizationType | null;
  registration_number: string;
  country: string | null;
  is_active: boolean;
  created_at: string;
  stakeholder_count: number;
  batch_count: number;
  active_anomalies: number;
  active_roles: StakeholderRole[];
}

/**
 * CBAC Permission creation request
 */
export interface CBACPermissionRequest {
  stakeholder_id: string;
  organization_id: string;
  can_create_batches?: boolean;
  can_approve_batches?: boolean;
  can_reject_batches?: boolean;
  can_recall_batches?: boolean;
  can_update_status?: boolean;
  can_view_all_batches?: boolean;
  can_view_analytics?: boolean;
  can_export_data?: boolean;
  can_manage_stakeholders?: boolean;
  custom_permissions?: Record<string, boolean>;
}

/**
 * Multi-tenant context for current user session
 */
export interface TenantContext {
  organization_id: string | null;
  organization_name: string | null;
  stakeholder_id: string | null;
  role: StakeholderRole | null;
  permissions: CBACPermission | null;
  is_admin: boolean;
}

/**
 * Check if a CBAC permission allows an action
 */
export function hasPermission(
  permissions: CBACPermission | null,
  action: keyof Omit<CBACPermission, 'id' | 'stakeholder_id' | 'organization_id' | 'custom_permissions' | 'created_at' | 'updated_at' | 'created_by'>
): boolean {
  if (!permissions) return false;
  return permissions[action] === true;
}

/**
 * Check custom permission
 */
export function hasCustomPermission(
  permissions: CBACPermission | null,
  customAction: string
): boolean {
  if (!permissions?.custom_permissions) return false;
  return permissions.custom_permissions[customAction] === true;
}
