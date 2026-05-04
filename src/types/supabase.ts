import { Database } from './database.types';

export type Batch = Database['public']['Tables']['batches']['Row'];
export type BatchInsert = Database['public']['Tables']['batches']['Insert'];
export type BatchUpdate = Database['public']['Tables']['batches']['Update'];

export type BatchHistory = Database['public']['Tables']['batch_history']['Row'];
export type BatchHistoryInsert = Database['public']['Tables']['batch_history']['Insert'];

export type Stakeholder = Database['public']['Tables']['stakeholders']['Row'];
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type AdminUser = Database['public']['Tables']['admin_users']['Row'];

export type UserRole = 'manufacturer' | 'distributor' | 'pharmacy' | 'regulator' | 'patient' | 'logistics' | 'admin';
export type BatchStatus = 'Pending' | 'Approved' | 'Rejected' | 'In-Transit' | 'At-Pharmacy' | 'Sold' | 'Expired' | 'Recalled';
