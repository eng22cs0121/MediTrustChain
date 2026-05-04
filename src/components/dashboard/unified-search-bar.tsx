"use client";

import { useState, useEffect } from "react";
import { useSearch } from "@/contexts/search-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowUpDown, Loader2, Package, AlertTriangle, History, X } from "lucide-react";
import { AdvancedFilters } from "./advanced-filters";
import { format } from "date-fns";
import { Batch } from "@/contexts/batches-context";
import { BatchRecall } from "@/types/recall";
import Link from "next/link";

export function UnifiedSearchBar() {
  const {
    filters,
    updateFilter,
    searchBatches,
    searchRecalls,
    activeCategory,
    setActiveCategory,
    isSearching,
    searchHistory,
    addToHistory,
    clearHistory,
    hasActiveFilters,
  } = useSearch();

  const [query, setQuery] = useState(filters.query || '');
  const [batchResults, setBatchResults] = useState<Batch[]>([]);
  const [recallResults, setRecallResults] = useState<BatchRecall[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (query || hasActiveFilters) {
      updateFilter('query', query || undefined);
      handleSearch();
    } else {
      setBatchResults([]);
      setRecallResults([]);
      setShowResults(false);
    }
  }, [query, filters.batchStatus, filters.recallClass, filters.recallStatus, filters.manufacturingDateFrom, filters.expiryDateFrom]);

  const handleSearch = () => {
    if (!query && !hasActiveFilters) return;

    const batchResult = searchBatches();
    const recallResult = searchRecalls();

    setBatchResults(batchResult.items);
    setRecallResults(recallResult.items);
    setShowResults(true);
    setShowHistory(false);

    if (query) {
      addToHistory({
        query,
        category: activeCategory,
        timestamp: new Date(),
        resultsCount: batchResult.total + recallResult.total,
      });
    }
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    updateFilter('query', historyQuery);
    setShowHistory(false);
  };

  return (
    <div className="relative w-full">
      <div className="flex gap-2 items-center">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search batches, recalls, transactions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (!query) setShowHistory(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            className="pl-10 pr-10"
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => {
                setQuery('');
                updateFilter('query', undefined);
                setBatchResults([]);
                setRecallResults([]);
                setShowResults(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Category Selector */}
        <Select value={activeCategory} onValueChange={(val) => setActiveCategory(val as any)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="batches">Batches</SelectItem>
            <SelectItem value="recalls">Recalls</SelectItem>
            <SelectItem value="transactions">Transactions</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={filters.sortBy}
          onValueChange={(val) => updateFilter('sortBy', val as any)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="quantity">Quantity</SelectItem>
            <SelectItem value="expiry">Expiry</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>

        {/* Advanced Filters */}
        <AdvancedFilters />

        {/* Search Button */}
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      </div>

      {/* Search History Dropdown */}
      {showHistory && searchHistory.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recent Searches</span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearHistory}>
                Clear
              </Button>
            </div>
            <div className="space-y-1">
              {searchHistory.slice(0, 5).map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(item.query)}
                  className="w-full text-left p-2 hover:bg-accent rounded-md text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span>{item.query}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.resultsCount} results
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results Dropdown */}
      {showResults && (query || hasActiveFilters) && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg max-h-[500px] overflow-hidden">
          <CardContent className="p-0">
            <Tabs defaultValue="batches" className="w-full">
              <div className="p-4 border-b">
                <TabsList className="w-full">
                  <TabsTrigger value="batches" className="flex-1">
                    <Package className="h-4 w-4 mr-2" />
                    Batches ({batchResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="recalls" className="flex-1">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Recalls ({recallResults.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="batches" className="m-0 max-h-[400px] overflow-y-auto">
                {batchResults.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No batches found
                  </div>
                ) : (
                  <div className="divide-y">
                    {batchResults.map((batch) => (
                      <Link
                        key={batch.id}
                        href={`/dashboard/batches/${batch.id}`}
                        className="block p-4 hover:bg-accent transition-colors"
                        onClick={() => setShowResults(false)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{batch.id}</span>
                              <Badge variant="outline">{batch.status}</Badge>
                              {batch.anomalyReason && (
                                <Badge variant="destructive">Flagged</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {batch.name} • {batch.manufacturer || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Mfg: {batch.mfg} • 
                              Exp: {batch.exp}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{batch.qty?.toLocaleString() || 0} units</p>
                            <p className="text-xs text-muted-foreground">{batch.history?.[batch.history.length - 1]?.location || 'Unknown'}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recalls" className="m-0 max-h-[400px] overflow-y-auto">
                {recallResults.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No recalls found
                  </div>
                ) : (
                  <div className="divide-y">
                    {recallResults.map((recall) => (
                      <Link
                        key={recall.id}
                        href={`/dashboard/recalls`}
                        className="block p-4 hover:bg-accent transition-colors"
                        onClick={() => setShowResults(false)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{recall.id}</span>
                              <Badge variant={
                                recall.recallClass === 'Class I' ? 'destructive' :
                                recall.recallClass === 'Class II' ? 'default' :
                                'secondary'
                              }>
                                {recall.recallClass}
                              </Badge>
                              <Badge variant="outline">{recall.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Batch: {recall.batchId} • {recall.batchName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {recall.reason}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{recall.responseRate}% responded</p>
                            <p className="text-xs text-muted-foreground">
                              {format(recall.recallDate, 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
