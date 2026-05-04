import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('drug_master')
    .select(`
      id,
      drug_name,
      drug_code,
      composition,
      strength,
      dosage_form,
      approved_expiry_months,
      composition_hash,
      blockchain_tx_hash,
      approved_by,
      approved_manufacturer_ids
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ drugs: data });
}
