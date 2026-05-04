async function applyMigration() {
    const token = process.env.SUPABASE_ACCESS_TOKEN;
    if (!token) {
        throw new Error('Missing SUPABASE_ACCESS_TOKEN environment variable.');
    }
    const projectRef = 'idmmiqypcjxejoyyhahj';

    const sql = `
-- Create anomaly_results table from scratch
CREATE TABLE IF NOT EXISTS anomaly_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  risk_score integer DEFAULT 0,
  is_anomaly boolean DEFAULT false,
  anomaly_types text[] DEFAULT '{}',
  reasons text[] DEFAULT '{}',
  analysis_notes text,
  analyzed_at timestamptz DEFAULT now(),
  analyzed_by text DEFAULT 'AI',
  status text NOT NULL DEFAULT 'open',
  severity text DEFAULT 'medium',
  title text,
  recommendation text,
  affected_stage text,
  review_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add GPS columns to batch_history if not present
ALTER TABLE batch_history
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_anomaly_results_status ON anomaly_results(status);
CREATE INDEX IF NOT EXISTS idx_anomaly_results_batch_id ON anomaly_results(batch_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_results_severity ON anomaly_results(severity);

-- Enable RLS
ALTER TABLE anomaly_results ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated stakeholders to read anomalies
CREATE POLICY "stakeholders_read_anomalies" ON anomaly_results
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow AI system to insert anomalies (service_role bypass)
CREATE POLICY "service_insert_anomalies" ON anomaly_results
  FOR INSERT WITH CHECK (true);

-- Allow regulators to update anomaly status
CREATE POLICY "regulators_update_anomalies" ON anomaly_results
  FOR UPDATE USING (auth.role() = 'authenticated');
`;

    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: sql })
    });

    const result = await response.text();
    if (!response.ok) {
        console.error('Migration failed:', result);
        process.exit(1);
    }
    console.log('SUCCESS: anomaly_results table created!');
    console.log(result.slice(0, 300));
}

applyMigration();
