export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type BatchStatus = 'Pending' | 'Approved' | 'Rejected' | 'In-Transit' | 'At-Pharmacy' | 'Sold' | 'Expired' | 'Recalled';
export type OrganizationType = 'manufacturer' | 'distributor' | 'regulator' | 'pharmacy' | 'logistics';
export type StakeholderRole = 'manufacturer' | 'distributor' | 'regulator' | 'pharmacy' | 'logistics';
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnomalyType = 'timing' | 'location' | 'quantity' | 'verification' | 'tampering' | 'status_regression' | 'expiry' | 'pattern';
export type AnomalyStatus = 'new' | 'investigating' | 'resolved' | 'false_positive';
export type NotificationType = 'info' | 'success' | 'warning' | 'danger';

export interface Database {
  public: {
    Tables: {
      // =====================================================
      // ORGANIZATIONS
      // =====================================================
      organizations: {
        Row: {
          id: string
          name: string
          organization_type: OrganizationType
          registration_number: string
          phone: string | null
          address: string | null
          country: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          is_active: boolean
          verification_documents: Json
        }
        Insert: {
          id?: string
          name: string
          organization_type: OrganizationType
          registration_number: string
          phone?: string | null
          address?: string | null
          country?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          is_active?: boolean
          verification_documents?: Json
        }
        Update: {
          id?: string
          name?: string
          organization_type?: OrganizationType
          registration_number?: string
          phone?: string | null
          address?: string | null
          country?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          is_active?: boolean
          verification_documents?: Json
        }
      }

      // =====================================================
      // DRUG MASTER
      // =====================================================
      drug_master: {
        Row: {
          id: string
          drug_name: string
          generic_name: string | null
          drug_code: string
          composition: string
          strength: string
          dosage_form: string
          approved_expiry_months: number
          approved_manufacturer_ids: string[]
          composition_hash: string
          blockchain_tx_hash: string | null
          blockchain_block: number | null
          approved_by: string | null
          approved_by_org: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          drug_name: string
          generic_name?: string | null
          drug_code: string
          composition: string
          strength: string
          dosage_form: string
          approved_expiry_months: number
          approved_manufacturer_ids?: string[]
          composition_hash: string
          blockchain_tx_hash?: string | null
          blockchain_block?: number | null
          approved_by?: string | null
          approved_by_org?: string | null
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['drug_master']['Insert']>
      }

      // =====================================================
      // STAKEHOLDERS
      // =====================================================
      stakeholders: {
        Row: {
          id: string
          organization_id: string
          full_name: string
          email: string
          phone: string | null
          position: string | null
          user_id: string | null
          wallet_address: string
          role: StakeholderRole
          is_active: boolean
          created_at: string
          created_by: string
          updated_at: string
          notes: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          organization_id: string
          full_name: string
          email: string
          phone?: string | null
          position?: string | null
          user_id?: string | null
          wallet_address: string
          role: StakeholderRole
          is_active?: boolean
          created_at?: string
          created_by: string
          updated_at?: string
          notes?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          organization_id?: string
          full_name?: string
          email?: string
          phone?: string | null
          position?: string | null
          user_id?: string | null
          wallet_address?: string
          role?: StakeholderRole
          is_active?: boolean
          created_at?: string
          created_by?: string
          updated_at?: string
          notes?: string | null
          metadata?: Json
        }
      }

      // =====================================================
      // ADMIN USERS
      // =====================================================
      admin_users: {
        Row: {
          id: string
          full_name: string
          email: string
          created_at: string | null
          last_active: string | null
          can_manage_organizations: boolean
          can_manage_stakeholders: boolean
          is_active: boolean
        }
        Insert: {
          id: string
          full_name: string
          email: string
          created_at?: string | null
          last_active?: string | null
          can_manage_organizations?: boolean
          can_manage_stakeholders?: boolean
          is_active?: boolean
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          created_at?: string | null
          last_active?: string | null
          can_manage_organizations?: boolean
          can_manage_stakeholders?: boolean
          is_active?: boolean
        }
      }

      // =====================================================
      // BATCHES
      // =====================================================
      batches: {
        Row: {
          id: string
          name: string
          mfg: string
          exp: string
          qty: number
          status: BatchStatus
          manufacturer: string | null
          manufacturer_id: string | null
          organization_id: string
          created_by_stakeholder_id: string | null
          anomaly_reason: string | null
          blockchain_tx_hash: string | null
          blockchain_block_number: number | null
          data_hash: string | null
          on_chain_batch_id: number | null
          current_holder: string | null
          is_blockchain_synced: boolean
          drug_master_id: string | null
          composition_hash: string | null
          composition: string | null
          strength: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          mfg: string
          exp: string
          qty: number
          status: BatchStatus
          manufacturer?: string | null
          manufacturer_id?: string | null
          organization_id: string
          created_by_stakeholder_id?: string | null
          anomaly_reason?: string | null
          blockchain_tx_hash?: string | null
          blockchain_block_number?: number | null
          data_hash?: string | null
          on_chain_batch_id?: number | null
          current_holder?: string | null
          is_blockchain_synced?: boolean
          drug_master_id?: string | null
          composition_hash?: string | null
          composition?: string | null
          strength?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          mfg?: string
          exp?: string
          qty?: number
          status?: BatchStatus
          manufacturer?: string | null
          manufacturer_id?: string | null
          organization_id?: string
          created_by_stakeholder_id?: string | null
          anomaly_reason?: string | null
          blockchain_tx_hash?: string | null
          blockchain_block_number?: number | null
          data_hash?: string | null
          on_chain_batch_id?: number | null
          current_holder?: string | null
          is_blockchain_synced?: boolean
          drug_master_id?: string | null
          composition_hash?: string | null
          composition?: string | null
          strength?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // =====================================================
      // BATCH HISTORY
      // =====================================================
      batch_history: {
        Row: {
          id: string
          batch_id: string
          location: string
          status: string
          timestamp: string
          updated_by: string | null
          notes: string | null
          blockchain_tx_hash: string | null
          created_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          location: string
          status: string
          timestamp?: string
          updated_by?: string | null
          notes?: string | null
          blockchain_tx_hash?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          batch_id?: string
          location?: string
          status?: string
          timestamp?: string
          updated_by?: string | null
          notes?: string | null
          blockchain_tx_hash?: string | null
          created_at?: string
        }
      }

      // =====================================================
      // ANOMALIES
      // =====================================================
      anomalies: {
        Row: {
          id: string
          batch_id: string | null
          organization_id: string | null
          type: AnomalyType
          severity: AnomalySeverity
          description: string
          detected_at: string
          status: AnomalyStatus
          confidence: number | null
          location: string | null
          expected_value: string | null
          actual_value: string | null
          metadata: Json
          assigned_to: string | null
          resolved_at: string | null
          resolution_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          batch_id?: string | null
          organization_id?: string | null
          type: AnomalyType
          severity: AnomalySeverity
          description: string
          detected_at?: string
          status?: AnomalyStatus
          confidence?: number | null
          location?: string | null
          expected_value?: string | null
          actual_value?: string | null
          metadata?: Json
          assigned_to?: string | null
          resolved_at?: string | null
          resolution_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          batch_id?: string | null
          organization_id?: string | null
          type?: AnomalyType
          severity?: AnomalySeverity
          description?: string
          detected_at?: string
          status?: AnomalyStatus
          confidence?: number | null
          location?: string | null
          expected_value?: string | null
          actual_value?: string | null
          metadata?: Json
          assigned_to?: string | null
          resolved_at?: string | null
          resolution_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // =====================================================
      // NOTIFICATIONS
      // =====================================================
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          type: NotificationType
          batch_id: string | null
          anomaly_id: string | null
          organization_id: string | null
          read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          type?: NotificationType
          batch_id?: string | null
          anomaly_id?: string | null
          organization_id?: string | null
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          type?: NotificationType
          batch_id?: string | null
          anomaly_id?: string | null
          organization_id?: string | null
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }

      // =====================================================
      // AUDIT LOGS
      // =====================================================
      audit_logs: {
        Row: {
          id: string
          timestamp: string
          event_type: string
          user_id: string | null
          user_email: string | null
          user_role: string | null
          organization_id: string | null
          resource: string | null
          action: string | null
          result: 'success' | 'failure' | 'denied'
          ip_address: string | null
          user_agent: string | null
          metadata: Json
          blockchain_tx_hash: string | null
          created_at: string
        }
        Insert: {
          id?: string
          timestamp?: string
          event_type: string
          user_id?: string | null
          user_email?: string | null
          user_role?: string | null
          organization_id?: string | null
          resource?: string | null
          action?: string | null
          result: 'success' | 'failure' | 'denied'
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          blockchain_tx_hash?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          timestamp?: string
          event_type?: string
          user_id?: string | null
          user_email?: string | null
          user_role?: string | null
          organization_id?: string | null
          resource?: string | null
          action?: string | null
          result?: 'success' | 'failure' | 'denied'
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          blockchain_tx_hash?: string | null
          created_at?: string
        }
      }

      // PROFILES table removed — it was a ghost definition with no corresponding DB table

      // =====================================================
      // AI ANOMALIES
      // =====================================================
      ai_anomalies: {
        Row: {
          id: string
          batch_id: string | null
          batch_code: string | null
          risk_score: number
          is_anomaly: boolean
          severity: AnomalySeverity
          anomaly_types: AnomalyType[]
          reasons: string[]
          analysis_notes: string | null
          analyzed_at: string
          analyzed_by: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          batch_id?: string | null
          batch_code?: string | null
          risk_score: number
          is_anomaly: boolean
          severity: AnomalySeverity
          anomaly_types: AnomalyType[]
          reasons: string[]
          analysis_notes?: string | null
          analyzed_at?: string
          analyzed_by?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          batch_id?: string | null
          batch_code?: string | null
          risk_score?: number
          is_anomaly?: boolean
          severity?: AnomalySeverity
          anomaly_types?: AnomalyType[]
          reasons?: string[]
          analysis_notes?: string | null
          analyzed_at?: string
          analyzed_by?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
        }
      }
    }

    // =====================================================
    // DATABASE FUNCTIONS
    // =====================================================
    Functions: {
      get_user_organization_id: {
        Args: Record<string, never>
        Returns: string | null
      }
      get_user_role: {
        Args: Record<string, never>
        Returns: StakeholderRole | null
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_stakeholder: {
        Args: Record<string, never>
        Returns: boolean
      }
      get_stakeholder_by_email_for_login: {
        Args: { p_email: string }
        Returns: {
          id: string
          email: string
          user_id: string | null
          organization_id: string
          role: StakeholderRole
          is_active: boolean
        }[]
      }
      create_stakeholder_by_admin: {
        Args: {
          p_organization_id: string
          p_full_name: string
          p_email: string
          p_wallet_address: string
          p_role: StakeholderRole
          p_user_id: string
          p_created_by: string
          p_phone?: string | null
          p_position?: string | null
          p_notes?: string | null
          p_metadata?: Json
        }
        Returns: {
          id: string
          organization_id: string
          full_name: string
          email: string
          phone: string | null
          position: string | null
          user_id: string | null
          wallet_address: string
          role: StakeholderRole
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          notes: string | null
          metadata: Json
        }[]
      }
    }

    // =====================================================
    // DATABASE ENUMS
    // =====================================================
    Enums: {
      batch_status: BatchStatus
      organization_type: OrganizationType
      stakeholder_role: StakeholderRole
      anomaly_severity: AnomalySeverity
      anomaly_type: AnomalyType
      anomaly_status: AnomalyStatus
      notification_type: NotificationType
    }
  }
}
