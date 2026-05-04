import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();

  const {
    drug_name,
    generic_name,
    drug_code,
    composition,
    strength,
    dosage_form,
    approved_expiry_months,
    approved_manufacturer_ids,
  } = body;

  // Verify regulator access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: stakeholder } = await supabase
    .from('stakeholders')
    .select('id, role, organization_id')
    .eq('user_id', user.id)
    .single();

  if (!stakeholder || stakeholder.role !== 'regulator') {
    return NextResponse.json({ error: 'Only regulators can approve drug templates' }, { status: 403 });
  }

  // Compute composition hash (same algorithm as smart contract keccak256)
  const compositionHash = '0x' + crypto
    .createHash('sha256')
    .update(drug_name + composition + strength)
    .digest('hex');

  const { data, error } = await supabase
    .from('drug_master')
    .insert({
      drug_name,
      generic_name,
      drug_code,
      composition,
      strength,
      dosage_form,
      approved_expiry_months,
      approved_manufacturer_ids: approved_manufacturer_ids || [],
      composition_hash: compositionHash,
      approved_by: stakeholder.id, // Fixed: Using stakeholder UUID instead of auth user ID
      approved_by_org: stakeholder.organization_id // Assuming the stakeholder belongs to an org
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting drug master:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ drug_master: data }, { status: 201 });
}
