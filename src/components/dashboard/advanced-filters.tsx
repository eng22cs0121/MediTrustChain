"use client";

import { useState } from "react";
import { useSearch } from "@/contexts/search-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Filter, X, Calendar as CalendarIcon, Save, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AdvancedFilters() {
  const { filters, updateFilter, clearFilters, hasActiveFilters, saveSearch, savedSearches, loadSearch, deleteSavedSearch } = useSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState("");

  const batchStatuses = ["Manufactured", "In Transit", "Delivered", "Verified", "Recalled", "Expired"];
  const recallClasses = ["Class I", "Class II", "Class III"];
  const recallStatuses = ["Initiated", "In Progress", "Completed", "Terminated", "Ongoing"];

  const activeFilterCount = Object.keys(filters).filter(
    key => !['sortBy', 'sortOrder', 'page', 'limit'].includes(key) && 
    filters[key as keyof typeof filters] !== undefined
  ).length;

  const handleSaveSearch = () => {
    if (searchName.trim()) {
      saveSearch(searchName, filters);
      setSearchName("");
      setSaveDialogOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[600px] max-h-[600px] overflow-y-auto" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Advanced Filters</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Batch Status Filter */}
            <div className="space-y-2">
              <Label>Batch Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {batchStatuses.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={filters.batchStatus?.includes(status)}
                      onCheckedChange={(checked) => {
                        const current = filters.batchStatus || [];
                        updateFilter(
                          'batchStatus',
                          checked
                            ? [...current, status]
                            : current.filter(s => s !== status)
                        );
                      }}
                    />
                    <label
                      htmlFor={`status-${status}`}
                      className="text-sm cursor-pointer"
                    >
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Recall Class Filter */}
            <div className="space-y-2">
              <Label>Recall Classification</Label>
              <div className="grid grid-cols-3 gap-2">
                {recallClasses.map((recallClass) => (
                  <div key={recallClass} className="flex items-center space-x-2">
                    <Checkbox
                      id={`recall-${recallClass}`}
                      checked={filters.recallClass?.includes(recallClass)}
                      onCheckedChange={(checked) => {
                        const current = filters.recallClass || [];
                        updateFilter(
                          'recallClass',
                          checked
                            ? [...current, recallClass]
                            : current.filter(c => c !== recallClass)
                        );
                      }}
                    />
                    <label
                      htmlFor={`recall-${recallClass}`}
                      className="text-sm cursor-pointer"
                    >
                      {recallClass}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Recall Status Filter */}
            <div className="space-y-2">
              <Label>Recall Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {recallStatuses.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`recall-status-${status}`}
                      checked={filters.recallStatus?.includes(status)}
                      onCheckedChange={(checked) => {
                        const current = filters.recallStatus || [];
                        updateFilter(
                          'recallStatus',
                          checked
                            ? [...current, status]
                            : current.filter(s => s !== status)
                        );
                      }}
                    />
                    <label
                      htmlFor={`recall-status-${status}`}
                      className="text-sm cursor-pointer"
                    >
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Manufacturing Date Range */}
            <div className="space-y-2">
              <Label>Manufacturing Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filters.manufacturingDateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.manufacturingDateFrom
                        ? format(filters.manufacturingDateFrom, "PPP")
                        : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.manufacturingDateFrom}
                      onSelect={(date) => updateFilter('manufacturingDateFrom', date)}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filters.manufacturingDateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.manufacturingDateTo
                        ? format(filters.manufacturingDateTo, "PPP")
                        : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.manufacturingDateTo}
                      onSelect={(date) => updateFilter('manufacturingDateTo', date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Expiry Date Range */}
            <div className="space-y-2">
              <Label>Expiry Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filters.expiryDateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.expiryDateFrom
                        ? format(filters.expiryDateFrom, "PPP")
                        : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.expiryDateFrom}
                      onSelect={(date) => updateFilter('expiryDateFrom', date)}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filters.expiryDateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.expiryDateTo
                        ? format(filters.expiryDateTo, "PPP")
                        : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.expiryDateTo}
                      onSelect={(date) => updateFilter('expiryDateTo', date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Quantity Range */}
            <div className="space-y-2">
              <Label>Quantity Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minQuantity || ''}
                  onChange={(e) => updateFilter('minQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxQuantity || ''}
                  onChange={(e) => updateFilter('maxQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
            </div>

            {/* Drug Name */}
            <div className="space-y-2">
              <Label>Drug Name</Label>
              <Input
                placeholder="Search by drug name..."
                value={filters.drugName || ''}
                onChange={(e) => updateFilter('drugName', e.target.value || undefined)}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Current Location</Label>
              <Input
                placeholder="Search by location..."
                value={filters.currentLocation || ''}
                onChange={(e) => updateFilter('currentLocation', e.target.value || undefined)}
              />
            </div>

            {/* Tampered Only */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="tampered-only"
                checked={filters.tamperedOnly || false}
                onCheckedChange={(checked) => updateFilter('tamperedOnly', checked as boolean)}
              />
              <label htmlFor="tampered-only" className="text-sm cursor-pointer">
                Show tampered batches only
              </label>
            </div>

            {/* Save Search */}
            <div className="pt-4 border-t flex gap-2">
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1" disabled={!hasActiveFilters}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Search
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Search</DialogTitle>
                    <DialogDescription>
                      Give this search a name to quickly access it later.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    placeholder="Search name..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                  <DialogFooter>
                    <Button onClick={handleSaveSearch}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Saved Searches Dropdown */}
      {savedSearches.length > 0 && (
        <Select onValueChange={loadSearch}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Saved searches" />
          </SelectTrigger>
          <SelectContent>
            {savedSearches.map((search) => (
              <SelectItem key={search.id} value={search.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{search.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSavedSearch(search.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
