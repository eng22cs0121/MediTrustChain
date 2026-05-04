"use client";

import { RecallManagement } from "@/components/dashboard/recall-management";

export default function RecallPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batch Recall Management</h1>
          <p className="text-muted-foreground">
            Manage product recalls in compliance with FDA regulations (21 CFR Part 7)
          </p>
        </div>
        <RecallManagement />
      </div>
    </div>
  );
}
