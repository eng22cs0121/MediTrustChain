/**
 * Batch Recall System Types
 * FDA Compliance: 21 CFR 7 (Food and Drug Administration Regulations)
 */

/**
 * FDA Recall Classifications
 * Class I: Dangerous or defective products that could cause serious health problems or death
 * Class II: Products that might cause temporary health problems or pose slight threat of serious nature
 * Class III: Products that are unlikely to cause adverse health reactions but violate FDA regulations
 */
export type RecallClass = 'Class I' | 'Class II' | 'Class III';

/**
 * Recall Status Workflow
 */
export type RecallStatus = 
  | 'Initiated'        // Recall just started
  | 'In Progress'      // Notifications sent, collecting responses
  | 'Completed'        // All units accounted for
  | 'Terminated'       // FDA approved termination
  | 'Ongoing';         // Long-term monitoring

/**
 * Recall Action Types
 */
export type RecallAction = 
  | 'Return'           // Return to manufacturer
  | 'Destroy'          // Destroy on-site
  | 'Quarantine'       // Hold pending further instructions
  | 'Correction';      // Fix issue without removal

/**
 * Main Recall Interface
 */
export interface BatchRecall {
  id: string;                          // Unique recall ID (e.g., RCL-2025-001)
  batchId: string;                     // Associated batch code
  batchName: string;                   // Drug name for reference
  manufacturer: string;                // Company initiating recall
  
  // Recall Classification
  recallClass: RecallClass;            // FDA classification
  recallDate: Date;                    // Date recall initiated
  
  // Reason & Details
  reason: string;                      // Detailed reason for recall
  healthHazard: string;                // Description of health risk
  affectedLotNumbers: string[];        // All affected lot numbers
  
  // Scope
  totalUnitsProduced: number;          // Total units in batch
  unitsDistributed: number;            // Units already distributed
  unitsRecovered: number;              // Units returned/destroyed
  unitsOutstanding: number;            // Still in circulation
  
  // Actions
  recommendedAction: RecallAction;     // What should be done
  recallStrategy: string;              // Distribution level (retail, wholesale, etc.)
  
  // Status & Progress
  status: RecallStatus;
  notificationsSent: number;           // Total notifications sent
  responsesReceived: number;           // Confirmations received
  responseRate: number;                // Percentage (calculated)
  
  // Compliance
  fdaNotified: boolean;                // Reported to FDA
  fdaNotificationDate?: Date;
  recallNumber?: string;               // FDA-assigned recall number
  
  // Participants Notified
  distributorsNotified: string[];
  pharmaciesNotified: string[];
  patientsNotified: number;            // Count for privacy
  
  // Documentation
  recallReportUrl?: string;            // Link to recall report
  pressReleaseUrl?: string;            // Public announcement
  
  // Tracking
  createdBy: string;                   // User who initiated
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Notes
  notes: string;
}

/**
 * Recall Notification Record
 */
export interface RecallNotification {
  id: string;
  recallId: string;
  recipientType: 'distributor' | 'pharmacy' | 'patient' | 'regulator';
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  
  sentAt: Date;
  acknowledgedAt?: Date;
  acknowledged: boolean;
  
  unitsHeld?: number;                  // Units they have
  actionTaken?: RecallAction;
  actionDate?: Date;
  notes?: string;
}

/**
 * Recall Response (from supply chain participant)
 */
export interface RecallResponse {
  notificationId: string;
  recallId: string;
  respondentName: string;
  respondentRole: string;
  
  unitsOnHand: number;
  actionTaken: RecallAction;
  actionCompletedDate: Date;
  
  // Evidence
  disposalDocumentUrl?: string;        // Proof of destruction
  returnTrackingNumber?: string;       // Shipping tracking
  
  comments: string;
  submittedAt: Date;
}

/**
 * Recall Statistics (for dashboard)
 */
export interface RecallStatistics {
  totalRecalls: number;
  activeRecalls: number;
  completedRecalls: number;
  
  byClass: {
    classI: number;
    classII: number;
    classIII: number;
  };
  
  totalUnitsRecovered: number;
  averageResponseTime: number;         // Hours
  averageRecoveryRate: number;         // Percentage
}

/**
 * FDA Form 3177 Data (Recall Report)
 */
export interface FDARecallReport {
  recallId: string;
  
  // Section 1: Firm Information
  firmName: string;
  firmAddress: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  
  // Section 2: Product Information
  productName: string;
  productCode: string;
  lotNumbers: string[];
  
  // Section 3: Reason for Recall
  reasonForRecall: string;
  classificationJustification: string;
  
  // Section 4: Distribution
  distributionPattern: string;
  quantityDistributed: number;
  dateDistributed: Date;
  
  // Section 5: Actions
  recallStrategy: string;
  depthOfRecall: 'Consumer' | 'Retail' | 'Wholesale';
  publicWarning: boolean;
  
  generatedAt: Date;
}
