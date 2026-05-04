"use client";

/**
 * Utility to clear all demo and stored data from localStorage
 * Use this to reset the application to a clean state
 * 
 * To use: Open browser console and run:
 * - window.clearAllData() - Clear everything
 * - window.clearBatches() - Clear only batches
 * - window.clearRecalls() - Clear only recalls
 */

export function clearAllData() {
  if (typeof window === 'undefined') return;

  const keysToRemove = [
    // NOTE: 'meditrust-batches' removed — batches are stored in Supabase, not localStorage
    'meditrust-recalls',
    'meditrust-recall-notifications',
    'meditrust-recall-responses',
    'meditrust-saved-searches',
    'meditrust-search-history',
    'meditrust-batch-templates',
    'meditrust-notifications',
    'meditrust-preferences',
    'meditrust-analytics-cache',
  ];

  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
    }
  });

  console.log('✅ All demo data cleared successfully');
  alert('All data cleared! Page will reload.');

  // Reload the page to reset all contexts
  window.location.reload();
}

export function clearBatches() {
  if (typeof window === 'undefined') return;
  console.warn('⚠️ Batches are stored in Supabase, not localStorage. Use the admin dashboard or database tools to clear batch data.');
  alert('Batches are stored in the database (Supabase). This operation only clears any stale localStorage cache. Refresh the page to reload from database.');
  try {
    localStorage.removeItem('meditrust-batches'); // Clear any stale cache
    window.location.reload();
  } catch (error) {
    console.error('Failed to clear batches cache:', error);
  }
}

export function clearRecalls() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('meditrust-recalls');
    localStorage.removeItem('meditrust-recall-notifications');
    localStorage.removeItem('meditrust-recall-responses');
    console.log('✅ Recalls cleared successfully');
    alert('Recalls cleared! Page will reload.');
    window.location.reload();
  } catch (error) {
    console.error('Failed to clear recalls:', error);
  }
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).clearAllData = clearAllData;
  (window as any).clearBatches = clearBatches;
  (window as any).clearRecalls = clearRecalls;
}
