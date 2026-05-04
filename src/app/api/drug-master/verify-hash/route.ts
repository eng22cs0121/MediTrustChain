import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { drug_master_id, composition_hash } = await req.json();

  if (!drug_master_id || !composition_hash) {
      return NextResponse.json({ valid: false, reason: 'Missing parameters' }, { status: 400 });
  }

  // Fetch from DB
  const { data: drug, error } = await supabase
    .from('drug_master')
    .select('composition_hash, blockchain_tx_hash, is_active')
    .eq('id', drug_master_id)
    .single();

  if (error || !drug) {
    return NextResponse.json({ valid: false, reason: 'Drug template not found' }, { status: 404 });
  }

  if (!drug.is_active) {
    return NextResponse.json({ valid: false, reason: 'Drug template has been deactivated' });
  }

  if (!drug.blockchain_tx_hash) {
    return NextResponse.json({ valid: false, reason: 'Drug template not yet confirmed on blockchain' });
  }

  const hashMatches = drug.composition_hash === composition_hash;

  return NextResponse.json({
    valid: hashMatches,
    reason: hashMatches ? null : 'Composition hash mismatch — possible tampering detected',
  });
}
