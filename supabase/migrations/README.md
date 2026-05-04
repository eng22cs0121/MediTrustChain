# Database Migration Guide

## Execution Order

Execute these migrations in the following order:

1. **20250118000001_01_create_enums.sql**
   - Creates enum types: `organization_type`, `stakeholder_role`

2. **20250118000002_02_create_organizations.sql**
   - Creates `organizations` table (NO email, NO password, NO wallet)
   - Creates indexes and RLS policies

3. **20250118000003_03_create_stakeholders.sql**
   - Creates `stakeholders` table (with email, password, wallet, role)
   - Creates helper functions and views
   - Creates indexes and RLS policies

4. **20250118000004_04_create_admin_users.sql**
   - Creates `admin_users` table for project owners

4B. **20250118000004b_04b_create_audit_logs.sql** (NEW)
   - Creates `audit_logs` table if it doesn't exist
   - Sets up indexes and basic RLS policies
   - **Run this BEFORE migration 05**

5. **20250118000005_05_update_audit_logs.sql**
   - Updates `audit_logs` table foreign keys and policies (if table exists)

6. **20250118000006_06_update_batches.sql**
   - **Creates** `batches` table if it doesn't exist
   - Updates `batches` table to reference organizations
   - Adds `created_by_stakeholder_id` column (if table already existed)
   - Sets up RLS policies for batches

7. **20250118000007_07_create_helper_functions.sql**
   - Creates utility functions for the hierarchical structure

8. **20250118000008_08_create_first_admin.sql**
   - Template for creating first admin (requires manual setup)

9. **20250118000009_09_create_ai_tables.sql**
   - Creates `anomalies` table for AI anomaly detection
   - Creates `notifications` table for user alerts

10. **20250118000010_10_fix_stakeholders_rls_recursion.sql**
   - **CRITICAL**: Fixes infinite recursion in stakeholders RLS policies
   - Replaces problematic self-referencing policy
   - Creates secure login lookup function
   - **Run this immediately if you see "infinite recursion" errors**

## Important Notes

- **Clean Database**: These migrations assume a clean database. If you have existing data, you may need to drop old tables first.
- **Admin User**: Migration 08 requires manual setup - create admin user in Supabase Auth first, then update the migration with the user ID.
- **RLS Policies**: Row Level Security is enabled on all tables. Make sure your Supabase project has RLS enabled.

## Running Migrations

### Via Supabase Dashboard
1. Go to SQL Editor
2. Execute each migration file in order (01-10)
3. Check for any errors
4. **If you see "infinite recursion" errors, run migration 10 immediately**

### Via Supabase CLI
```bash
# Make sure you're in the project directory
cd MediTrustChain

# Link to your Supabase project (if not already linked)
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push
```

## Migration 09 - AI Tables (Optional)

Migration 09 creates tables for AI features:
- **anomalies**: Stores AI-detected anomalies in the supply chain
- **notifications**: Stores user notifications including AI alerts

**Note**: This migration is optional if you're not using AI features. However, if your code references these tables (like `saveAnomaly()` in `alerts.ts`), you should run this migration.

## Verification

After running migrations, verify:

1. ✅ `organizations` table exists (no email column)
2. ✅ `stakeholders` table exists (with email, wallet_address, role)
3. ✅ `admin_users` table exists
4. ✅ Helper functions are created
5. ✅ RLS policies are active
6. ✅ Can create organization without email/password/wallet
7. ✅ Can create stakeholder with email, password, wallet, role

## Troubleshooting

- **Enum already exists**: If you see "type already exists" errors, the enum was created in a previous migration. This is safe to ignore.
- **Table already exists**: If tables already exist, you may need to drop them first or modify the migrations to use `CREATE TABLE IF NOT EXISTS`.
- **RLS policy conflicts**: If you see policy conflicts, drop the old policies first before creating new ones.
- **Infinite recursion error**: If you see "infinite recursion detected in policy for relation 'stakeholders'", run migration 10 to fix the RLS policy issue.
