"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SearchFilters, SearchResult, SavedSearch, SearchCategory, SearchHistoryItem } from '@/types/search';
import { Batch } from '@/contexts/batches-context';
import { BatchRecall } from '@/types/recall';

interface SearchContextType {
  // Current filters
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  clearFilters: () => void;
  
  // Search operations
  searchBatches: (filters?: SearchFilters) => SearchResult<Batch>;
  searchRecalls: (filters?: SearchFilters) => SearchResult<BatchRecall>;
  
  // Saved searches
  savedSearches: SavedSearch[];
  saveSearch: (name: string, filters: SearchFilters) => void;
  loadSearch: (id: string) => void;
  deleteSavedSearch: (id: string) => void;
  
  // Search history
  searchHistory: SearchHistoryItem[];
  addToHistory: (item: SearchHistoryItem) => void;
  clearHistory: () => void;
  
  // Active category
  activeCategory: SearchCategory;
  setActiveCategory: (category: SearchCategory) => void;
  
  // Results
  isSearching: boolean;
  hasActiveFilters: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'date',
    sortOrder: 'desc',
    page: 1,
    limit: 20,
  });
  
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [isSearching, setIsSearching] = useState(false);

  // Load saved data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('meditrust-saved-searches');
    const history = localStorage.getItem('meditrust-search-history');
    
    if (saved) setSavedSearches(JSON.parse(saved));
    if (history) setSearchHistory(JSON.parse(history));
  }, []);

  // Check if any filters are active
  const hasActiveFilters = Object.keys(filters).some(
    key => !['sortBy', 'sortOrder', 'page', 'limit'].includes(key) && 
    filters[key as keyof SearchFilters] !== undefined
  );

  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K, 
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      sortBy: 'date',
      sortOrder: 'desc',
      page: 1,
      limit: 20,
    });
  }, []);

  const searchBatches = useCallback((searchFilters?: SearchFilters): SearchResult<Batch> => {
    setIsSearching(true);
    const activeFilters = searchFilters || filters;
    
    // Get batches from localStorage or context
    const batchesData = localStorage.getItem('meditrust-batches');
    let batches: Batch[] = batchesData ? JSON.parse(batchesData) : [];

    // Apply filters
    let filtered = batches;

    // Text search - using correct Batch properties (id, name, manufacturer)
    if (activeFilters.query) {
      const query = activeFilters.query.toLowerCase();
      filtered = filtered.filter(batch =>
        batch.id.toLowerCase().includes(query) ||
        batch.name.toLowerCase().includes(query) ||
        (batch.manufacturer || '').toLowerCase().includes(query)
      );
    }

    // Status filter
    if (activeFilters.batchStatus && activeFilters.batchStatus.length > 0) {
      filtered = filtered.filter(batch => 
        activeFilters.batchStatus!.includes(batch.status)
      );
    }

    // Manufacturer filter
    if (activeFilters.manufacturer && activeFilters.manufacturer.length > 0) {
      filtered = filtered.filter(batch =>
        batch.manufacturer && activeFilters.manufacturer!.includes(batch.manufacturer)
      );
    }

    // Drug name filter - using 'name' property
    if (activeFilters.drugName) {
      const drugQuery = activeFilters.drugName.toLowerCase();
      filtered = filtered.filter(batch =>
        batch.name.toLowerCase().includes(drugQuery)
      );
    }

    // Date filters - using 'mfg' and 'exp' properties
    if (activeFilters.manufacturingDateFrom) {
      filtered = filtered.filter(batch =>
        new Date(batch.mfg) >= activeFilters.manufacturingDateFrom!
      );
    }
    if (activeFilters.manufacturingDateTo) {
      filtered = filtered.filter(batch =>
        new Date(batch.mfg) <= activeFilters.manufacturingDateTo!
      );
    }
    if (activeFilters.expiryDateFrom) {
      filtered = filtered.filter(batch =>
        new Date(batch.exp) >= activeFilters.expiryDateFrom!
      );
    }
    if (activeFilters.expiryDateTo) {
      filtered = filtered.filter(batch =>
        new Date(batch.exp) <= activeFilters.expiryDateTo!
      );
    }

    // Quantity filters - using 'qty' property
    if (activeFilters.minQuantity !== undefined) {
      filtered = filtered.filter(batch => batch.qty >= activeFilters.minQuantity!);
    }
    if (activeFilters.maxQuantity !== undefined) {
      filtered = filtered.filter(batch => batch.qty <= activeFilters.maxQuantity!);
    }

    // Tampered only filter - using anomalyReason as equivalent
    if (activeFilters.tamperedOnly) {
      filtered = filtered.filter(batch => batch.anomalyReason);
    }

    // Location filter - using last history entry
    if (activeFilters.currentLocation) {
      const locQuery = activeFilters.currentLocation.toLowerCase();
      filtered = filtered.filter(batch => {
        const lastLocation = batch.history?.[batch.history.length - 1]?.location || '';
        return lastLocation.toLowerCase().includes(locQuery);
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      const order = activeFilters.sortOrder === 'asc' ? 1 : -1;
      
      switch (activeFilters.sortBy) {
        case 'date':
          return (new Date(a.mfg).getTime() - 
                  new Date(b.mfg).getTime()) * order;
        case 'name':
          return a.name.localeCompare(b.name) * order;
        case 'status':
          return a.status.localeCompare(b.status) * order;
        case 'quantity':
          return (a.qty - b.qty) * order;
        case 'expiry':
          return (new Date(a.exp).getTime() - 
                  new Date(b.exp).getTime()) * order;
        default:
          return 0;
      }
    });

    // Pagination
    const page = activeFilters.page || 1;
    const limit = activeFilters.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = filtered.slice(startIndex, endIndex);

    setIsSearching(false);

    return {
      items: paginatedItems,
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit),
      hasMore: endIndex < filtered.length,
    };
  }, [filters]);

  const searchRecalls = useCallback((searchFilters?: SearchFilters): SearchResult<BatchRecall> => {
    setIsSearching(true);
    const activeFilters = searchFilters || filters;
    
    // Get recalls from localStorage
    const recallsData = localStorage.getItem('meditrust-recalls');
    let recalls: BatchRecall[] = recallsData ? JSON.parse(recallsData) : [];

    // Apply filters
    let filtered = recalls;

    // Text search
    if (activeFilters.query) {
      const query = activeFilters.query.toLowerCase();
      filtered = filtered.filter(recall =>
        recall.id.toLowerCase().includes(query) ||
        recall.batchId.toLowerCase().includes(query) ||
        recall.reason.toLowerCase().includes(query)
      );
    }

    // Recall class filter
    if (activeFilters.recallClass && activeFilters.recallClass.length > 0) {
      filtered = filtered.filter(recall =>
        activeFilters.recallClass!.includes(recall.recallClass)
      );
    }

    // Recall status filter
    if (activeFilters.recallStatus && activeFilters.recallStatus.length > 0) {
      filtered = filtered.filter(recall =>
        activeFilters.recallStatus!.includes(recall.status)
      );
    }

    // Manufacturer filter
    if (activeFilters.manufacturer && activeFilters.manufacturer.length > 0) {
      filtered = filtered.filter(recall =>
        activeFilters.manufacturer!.includes(recall.manufacturer)
      );
    }

    // Date filters
    if (activeFilters.startDate) {
      filtered = filtered.filter(recall =>
        new Date(recall.recallDate) >= activeFilters.startDate!
      );
    }
    if (activeFilters.endDate) {
      filtered = filtered.filter(recall =>
        new Date(recall.recallDate) <= activeFilters.endDate!
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      const order = activeFilters.sortOrder === 'asc' ? 1 : -1;
      return (new Date(a.recallDate).getTime() - 
              new Date(b.recallDate).getTime()) * order;
    });

    // Pagination
    const page = activeFilters.page || 1;
    const limit = activeFilters.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = filtered.slice(startIndex, endIndex);

    setIsSearching(false);

    return {
      items: paginatedItems,
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit),
      hasMore: endIndex < filtered.length,
    };
  }, [filters]);

  const saveSearch = useCallback((name: string, searchFilters: SearchFilters) => {
    const newSearch: SavedSearch = {
      id: `search-${Date.now()}`,
      name,
      filters: searchFilters,
      createdAt: new Date(),
    };

    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem('meditrust-saved-searches', JSON.stringify(updated));
  }, [savedSearches]);

  const loadSearch = useCallback((id: string) => {
    const search = savedSearches.find(s => s.id === id);
    if (search) {
      setFilters(search.filters);
      
      // Update last used
      const updated = savedSearches.map(s =>
        s.id === id ? { ...s, lastUsed: new Date() } : s
      );
      setSavedSearches(updated);
      localStorage.setItem('meditrust-saved-searches', JSON.stringify(updated));
    }
  }, [savedSearches]);

  const deleteSavedSearch = useCallback((id: string) => {
    const updated = savedSearches.filter(s => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('meditrust-saved-searches', JSON.stringify(updated));
  }, [savedSearches]);

  const addToHistory = useCallback((item: SearchHistoryItem) => {
    const updated = [item, ...searchHistory.slice(0, 49)]; // Keep last 50
    setSearchHistory(updated);
    localStorage.setItem('meditrust-search-history', JSON.stringify(updated));
  }, [searchHistory]);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('meditrust-search-history');
  }, []);

  return (
    <SearchContext.Provider value={{
      filters,
      setFilters,
      updateFilter,
      clearFilters,
      searchBatches,
      searchRecalls,
      savedSearches,
      saveSearch,
      loadSearch,
      deleteSavedSearch,
      searchHistory,
      addToHistory,
      clearHistory,
      activeCategory,
      setActiveCategory,
      isSearching,
      hasActiveFilters,
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
}
