export interface NotificationPreferences {
  // Email notifications
  emailEnabled: boolean;
  emailAddress?: string;
  
  // Notification categories
  categories: {
    batchUpdates: boolean;
    recalls: boolean;
    verificationAlerts: boolean;
    tamperingAlerts: boolean;
    expiryWarnings: boolean;
    shipmentUpdates: boolean;
    systemAlerts: boolean;
    securityAlerts: boolean;
  };
  
  // Delivery methods
  deliveryMethods: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  
  // Notification timing
  timing: {
    immediate: boolean;
    digest: 'never' | 'hourly' | 'daily' | 'weekly';
    digestTime?: string; // e.g., "09:00"
    quietHoursEnabled: boolean;
    quietHoursStart?: string; // e.g., "22:00"
    quietHoursEnd?: string; // e.g., "08:00"
  };
  
  // Priority filters
  priority: {
    critical: boolean;
    high: boolean;
    medium: boolean;
    low: boolean;
  };
  
  // Role-specific preferences
  roleSpecific?: {
    manufacturer?: {
      batchCreated: boolean;
      batchTransferred: boolean;
      qualityAlerts: boolean;
    };
    distributor?: {
      shipmentReceived: boolean;
      shipmentDelivered: boolean;
      inventoryAlerts: boolean;
    };
    pharmacy?: {
      orderReceived: boolean;
      stockAlerts: boolean;
      expiryAlerts: boolean;
    };
    patient?: {
      drugVerification: boolean;
      recallNotifications: boolean;
      safetyAlerts: boolean;
    };
    regulator?: {
      complianceAlerts: boolean;
      recallReports: boolean;
      auditAlerts: boolean;
    };
  };
  
  // Advanced settings
  advanced: {
    autoMarkAsRead: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    showPreview: boolean;
    groupSimilar: boolean;
  };
}

export interface BatchTemplate {
  id: string;
  name: string;
  description?: string;
  
  // Template data
  templateData: {
    drugName?: string;
    drugCategory?: string;
    dosageForm?: string;
    strength?: string;
    unitSize?: string;
    storageConditions?: string;
    handlingInstructions?: string;
    shelfLife?: number; // in months
    manufacturer?: string;
    manufacturingLocation?: string;
    defaultQuantity?: number;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  usageCount: number;
  lastUsed?: Date;
  
  // Tags for organization
  tags?: string[];
  category?: string;
  
  // Sharing
  isPublic: boolean;
  sharedWith?: string[];
}

export interface QRCodeOptions {
  // Basic options
  size: number;
  includeMargin: boolean;
  
  // Visual customization
  foregroundColor: string;
  backgroundColor: string;
  
  // Logo/Image
  logoUrl?: string;
  logoSize?: number;
  logoBackgroundColor?: string;
  
  // Error correction level
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  
  // Format
  format: 'png' | 'svg' | 'jpeg';
  
  // Advanced styling
  style?: {
    dotsType?: 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded';
    cornersSquareType?: 'square' | 'dot' | 'extra-rounded';
    cornersDotType?: 'square' | 'dot';
  };
  
  // Gradients
  gradient?: {
    type: 'linear' | 'radial';
    colorStops: Array<{ offset: number; color: string }>;
  };
}

export interface QRCodeData {
  batchId: string;
  drugName: string;
  manufacturer: string;
  manufacturingDate: string;
  expiryDate: string;
  verificationUrl: string;
  blockchainHash?: string;
}
