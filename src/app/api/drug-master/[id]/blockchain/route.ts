import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const { blockchain_tx_hash, blockchain_block } = await req.json();

  if (!blockchain_tx_hash) {
     return NextResponse.json({ error: 'blockchain_tx_hash is required' }, { status: 400 });
  }

  // Verify regulator access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: stakeholder } = await supabase
    .from('stakeholders')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!stakeholder || stakeholder.role !== 'regulator') {
    return NextResponse.json({ error: 'Only regulators can update drug templates' }, { status: 403 });
  }

  const { error } = await supabase
    .from('drug_master')
    .update({ blockchain_tx_hash, blockchain_block })
    .eq('id', id);

  if (error) {
    console.error('Error updating blockchain hash:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
