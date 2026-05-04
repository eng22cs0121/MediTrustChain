export interface SearchFilters {
  // Text search
  query?: string;
  
  // Batch filters
  batchId?: string;
  batchStatus?: string[];
  manufacturer?: string[];
  drugName?: string;
  
  // Date filters
  startDate?: Date;
  endDate?: Date;
  manufacturingDateFrom?: Date;
  manufacturingDateTo?: Date;
  expiryDateFrom?: Date;
  expiryDateTo?: Date;
  
  // Recall filters
  recallClass?: string[];
  recallStatus?: string[];
  
  // Location filters
  currentLocation?: string;
  distributionArea?: string[];
  
  // Quantity filters
  minQuantity?: number;
  maxQuantity?: number;
  
  // Transaction filters
  transactionType?: string[];
  
  // Verification filters
  verificationStatus?: string[];
  tamperedOnly?: boolean;
  
  // User filters
  role?: string[];
  
  // Sorting
  sortBy?: 'date' | 'name' | 'status' | 'quantity' | 'expiry';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  limit?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: Date;
  lastUsed?: Date;
}

export type SearchCategory = 'batches' | 'recalls' | 'transactions' | 'users' | 'all';

export interface SearchHistoryItem {
  query: string;
  category: SearchCategory;
  timestamp: Date;
  resultsCount: number;
}
