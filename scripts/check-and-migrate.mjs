/**
 * check-and-migrate.mjs
 * Connects to the live Supabase project using service role key,
 * checks which tables/columns are missing, and applies the SQL migration files.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Credentials ────────────────────────────────────────────────────────────
const SUPABASE_URL       = 'https://zeejqezxdmwfwpjtjxkh.supabase.co';
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY env var not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── Helpers ────────────────────────────────────────────────────────────────
async function tableExists(table) {
  const { data, error } = await supabase.from(table).select('*').limit(1);
  // error code 42P01 = table does not exist (PostgREST wraps it)
  if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) return false;
  return true;
}

async function columnExists(table, column) {
  const { data, error } = await supabase.from(table).select(column).limit(1);
  if (error && (error.message?.includes(column) || error.message?.includes('does not exist'))) return false;
  return true;
}

// ─── Execute SQL via RPC exec_sql (if available) or management API ────────────
async function execSQL(sql, description) {
  console.log(`\n▶ Running: ${description}`);
  // Try via rpc 'exec_sql' function first (may exist in some setups)
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    // Fall back to direct REST call with service key (works if using Supabase Dashboard API)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });
    const body = await response.json();
    if (!response.ok) {
      console.error(`  ✗ Failed: ${JSON.stringify(body)}`);
      return false;
    }
  }
  console.log(`  ✓ Done`);
  return true;
}

// ─── Main audit + migrate ────────────────────────────────────────────────────
async function main() {
  console.log('=== MediTrustChain — Live Database Migration Check ===\n');
  console.log(`Project: ${SUPABASE_URL}\n`);

  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');

  // ── Check 1: Core tables ──────────────────────────────────────────────────
  const coreChecks = [
    'organizations', 'stakeholders', 'admin_users', 'batches',
    'batch_history', 'cbac_permissions'
  ];
  console.log('── Core Table Checks ──');
  const missingCore = [];
  for (const t of coreChecks) {
    const exists = await tableExists(t);
    console.log(`  ${exists ? '✅' : '❌'} ${t}`);
    if (!exists) missingCore.push(t);
  }

  // ── Check 2: drug_master (new) ────────────────────────────────────────────
  console.log('\n── Drug Master Table ──');
  const dmExists = await tableExists('drug_master');
  console.log(`  ${dmExists ? '✅' : '❌'} drug_master`);

  // ── Check 3: batches new columns ─────────────────────────────────────────
  console.log('\n── Batches New Columns (Drug Master FK) ──');
  const colChecks = ['drug_master_id', 'composition_hash', 'composition', 'strength'];
  const missingCols = [];
  for (const col of colChecks) {
    const exists = await columnExists('batches', col);
    console.log(`  ${exists ? '✅' : '❌'} batches.${col}`);
    if (!exists) missingCols.push(col);
  }

  // ── Check 4: batches blockchain columns ───────────────────────────────────
  console.log('\n── Batches Blockchain Columns ──');
  const blockchainCols = ['blockchain_tx_hash', 'data_hash', 'on_chain_batch_id', 'is_blockchain_synced'];
  for (const col of blockchainCols) {
    const exists = await columnExists('batches', col);
    console.log(`  ${exists ? '✅' : '❌'} batches.${col}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n────────────────────────────────────');
  if (missingCore.length === 0 && dmExists && missingCols.length === 0) {
    console.log('✅ All required tables and columns are present in the database!');
    console.log('   No migrations need to be applied.');
  } else {
    console.log('⚠️  Missing items detected:');
    if (missingCore.length > 0) console.log(`   Missing tables: ${missingCore.join(', ')}`);
    if (!dmExists) console.log('   Missing table: drug_master');
    if (missingCols.length > 0) console.log(`   Missing columns on batches: ${missingCols.join(', ')}`);
    
    console.log('\n── Attempting to apply missing migrations ──');

    // Apply drug_master migration if needed
    if (!dmExists) {
      const sql = readFileSync(join(migrationsDir, '20260311000001_drug_master.sql'), 'utf-8');
      await execSQL(sql, '20260311000001_drug_master.sql');
    }

    // Apply batches FK migration if columns missing
    if (missingCols.length > 0) {
      const sql = readFileSync(join(migrationsDir, '20260311000002_batches_add_drug_master_fk.sql'), 'utf-8');
      await execSQL(sql, '20260311000002_batches_add_drug_master_fk.sql');
    }

    console.log('\nNOTE: If exec_sql RPC is not available, apply migrations manually via the');
    console.log('Supabase SQL Editor at: https://supabase.com/dashboard/project/zeejqezxdmwfwpjtjxkh/sql');
  }
}

main().catch(console.error);
