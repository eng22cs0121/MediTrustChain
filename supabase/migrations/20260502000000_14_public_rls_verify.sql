-- Add public read access to batches and history for the verify page
-- This allows unauthenticated users to view the live GPS tracking map

CREATE POLICY "public_select_batches" 
ON batches 
FOR SELECT 
USING (true);

CREATE POLICY "public_select_history" 
ON batch_history 
FOR SELECT 
USING (true);
