import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Create admin client with service role key for user creation
const supabaseAdmin = createClient(

    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function POST(request: NextRequest) {
    try {
        // Get request body
        const body = await request.json();
        const {
            organization_id,
            full_name,
            email,
            password,
            wallet_address,
            role,
            phone,
            position,
            notes,
            metadata
        } = body;

        // Validate required fields
        if (!organization_id || !full_name || !email || !password || !wallet_address || !role) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate wallet address format
        if (!wallet_address.match(/^0x[a-fA-F0-9]{40}$/)) {
            return NextResponse.json(
                { success: false, error: 'Invalid wallet address format' },
                { status: 400 }
            );
        }

        // Verify the caller is an authenticated admin
        const serverClient = await createServerClient();
        const { data: { user: callerUser } } = await serverClient.auth.getUser();

        if (!callerUser) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Check if caller is admin using service role client (bypasses RLS)
        const { data: adminUser, error: adminError } = await supabaseAdmin
            .from('admin_users')
            .select('id, is_active, can_manage_stakeholders')
            .eq('id', callerUser.id)
            .eq('is_active', true)
            .single();

        if (adminError || !adminUser || !adminUser.can_manage_stakeholders) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Admin access required' },
                { status: 403 }
            );
        }

        // Verify organization exists
        const { data: orgData, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('id, name, organization_type')
            .eq('id', organization_id)
            .eq('is_active', true)
            .single();

        if (orgError || !orgData) {
            return NextResponse.json(
                { success: false, error: 'Organization not found or inactive' },
                { status: 404 }
            );
        }

        // Check for duplicate email in stakeholders
        const { data: existingEmail } = await supabaseAdmin
            .from('stakeholders')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingEmail) {
            return NextResponse.json(
                { success: false, error: `Email already registered: ${email}` },
                { status: 409 }
            );
        }

        // Check for duplicate wallet address
        const { data: existingWallet } = await supabaseAdmin
            .from('stakeholders')
            .select('id')
            .eq('wallet_address', wallet_address.toLowerCase())
            .single();

        if (existingWallet) {
            return NextResponse.json(
                { success: false, error: 'Wallet address already registered' },
                { status: 409 }
            );
        }

        // Create Supabase Auth user using admin client
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                organization_id,
                organization_name: orgData.name,
                organization_type: orgData.organization_type,
                is_stakeholder: true,
                wallet_address: wallet_address.toLowerCase(),
                role,
            },
        });

        if (authError || !authData.user) {
            console.error('Auth user creation error:', authError);
            return NextResponse.json(
                { success: false, error: authError?.message || 'Failed to create auth user' },
                { status: 500 }
            );
        }

        // Create stakeholder record
        const { data: stakeholder, error: stakeholderError } = await supabaseAdmin
            .from('stakeholders')
            .insert({
                organization_id,
                full_name,
                email: email.toLowerCase(),
                phone: phone || null,
                position: position || null,
                user_id: authData.user.id,
                wallet_address: wallet_address.toLowerCase(),
                role,
                is_active: true,
                created_by: callerUser.id,
                notes: notes || null,
                metadata: metadata || {}
            })
            .select()
            .single();

        if (stakeholderError) {
            // Rollback: delete the auth user if stakeholder creation failed
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            console.error('Stakeholder creation error:', stakeholderError);
            return NextResponse.json(
                { success: false, error: stakeholderError.message || 'Failed to create stakeholder record' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            stakeholder
        });

    } catch (error: any) {
        console.error('Stakeholder API error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            id,
            full_name,
            email,
            password,
            wallet_address,
            role,
            phone,
            position,
            notes
        } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Stakeholder ID is required' }, { status: 400 });
        }

        // Verify admin
        const serverClient = await createServerClient();
        const { data: { user: callerUser } } = await serverClient.auth.getUser();

        if (!callerUser) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const { data: adminUser } = await supabaseAdmin
            .from('admin_users')
            .select('can_manage_stakeholders')
            .eq('id', callerUser.id)
            .eq('is_active', true)
            .single();

        if (!adminUser?.can_manage_stakeholders) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        // Get existing stakeholder to find auth user_id
        const { data: existingStakeholder } = await supabaseAdmin
            .from('stakeholders')
            .select('user_id, email')
            .eq('id', id)
            .single();

        if (!existingStakeholder) {
            return NextResponse.json({ success: false, error: 'Stakeholder not found' }, { status: 404 });
        }

        // 1. Update Auth User (Email/Password)
        const authUpdates: any = {};
        if (email && email !== existingStakeholder.email) authUpdates.email = email;
        if (password && password.trim() !== "") authUpdates.password = password;

        // Update metadata if role or wallet changes
        if (role || wallet_address) {
            authUpdates.user_metadata = {
                ...authUpdates.user_metadata,
            };
            if (role) authUpdates.user_metadata.role = role;
            if (wallet_address) authUpdates.user_metadata.wallet_address = wallet_address.toLowerCase();
        }

        if (Object.keys(authUpdates).length > 0 && existingStakeholder.user_id) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                existingStakeholder.user_id,
                authUpdates
            );
            if (authError) throw authError;
        }

        // 2. Update Database Record
        const dbUpdates: any = {};
        if (full_name) dbUpdates.full_name = full_name;
        if (email) dbUpdates.email = email;
        if (wallet_address) dbUpdates.wallet_address = wallet_address.toLowerCase();
        if (role) dbUpdates.role = role;
        if (phone !== undefined) dbUpdates.phone = phone;
        if (position !== undefined) dbUpdates.position = position;
        if (notes !== undefined) dbUpdates.notes = notes;

        const { data: updatedStakeholder, error: dbError } = await supabaseAdmin
            .from('stakeholders')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, stakeholder: updatedStakeholder });

    } catch (error: any) {
        console.error('Stakeholder UPDATE error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { stakeholderId } = body;

        if (!stakeholderId) {
            return NextResponse.json(
                { success: false, error: 'Stakeholder ID is required' },
                { status: 400 }
            );
        }

        // Verify the caller is an authenticated admin
        const serverClient = await createServerClient();
        const { data: { user: callerUser } } = await serverClient.auth.getUser();

        if (!callerUser) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Check if caller is admin using service role client (bypasses RLS)
        const { data: adminUser, error: adminError } = await supabaseAdmin
            .from('admin_users')
            .select('id, is_active, can_manage_stakeholders')
            .eq('id', callerUser.id)
            .eq('is_active', true)
            .single();

        if (adminError || !adminUser || !adminUser.can_manage_stakeholders) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Admin access required' },
                { status: 403 }
            );
        }

        // Get stakeholder to find the auth user_id
        const { data: stakeholder, error: stakeholderError } = await supabaseAdmin
            .from('stakeholders')
            .select('id, user_id, full_name, email')
            .eq('id', stakeholderId)
            .single();

        if (stakeholderError || !stakeholder) {
            return NextResponse.json(
                { success: false, error: 'Stakeholder not found' },
                { status: 404 }
            );
        }

        // Delete the stakeholder record first
        const { error: deleteError } = await supabaseAdmin
            .from('stakeholders')
            .delete()
            .eq('id', stakeholderId);

        if (deleteError) {
            console.error('Stakeholder deletion error:', deleteError);
            return NextResponse.json(
                { success: false, error: deleteError.message || 'Failed to delete stakeholder' },
                { status: 500 }
            );
        }

        // Delete the auth user if they exist
        if (stakeholder.user_id) {
            const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
                stakeholder.user_id
            );

            if (authDeleteError) {
                console.error('Auth user deletion error:', authDeleteError);
                // Log but don't fail - stakeholder record is already deleted
            }
        }

        return NextResponse.json({
            success: true,
            message: `Stakeholder ${stakeholder.full_name || stakeholder.email} deleted successfully`
        });

    } catch (error: any) {
        console.error('Stakeholder DELETE API error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET /api/stakeholders
// Admin: returns all stakeholders with their organization.
// Active stakeholder: returns only their own organization's stakeholders.
export async function GET(request: NextRequest) {
    try {
        const serverClient = await createServerClient();
        const { data: { user: callerUser } } = await serverClient.auth.getUser();

        if (!callerUser) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Check if caller is a system admin
        const { data: adminUser } = await supabaseAdmin
            .from('admin_users')
            .select('id, is_active')
            .eq('id', callerUser.id)
            .eq('is_active', true)
            .maybeSingle();

        if (adminUser) {
            // Admin sees all stakeholders with their organisation details
            const { data: stakeholders, error } = await supabaseAdmin
                .from('stakeholders')
                .select(`
                    id, full_name, email, role, wallet_address, is_active, phone, position,
                    created_at, organization_id,
                    organizations ( id, name, organization_type )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return NextResponse.json({ success: true, stakeholders: stakeholders ?? [] });
        }

        // Regular stakeholder: resolve their organisation first, then return org peers
        const { data: callerStakeholder, error: callerError } = await supabaseAdmin
            .from('stakeholders')
            .select('id, organization_id, is_active')
            .eq('user_id', callerUser.id)
            .eq('is_active', true)
            .maybeSingle();

        if (callerError || !callerStakeholder) {
            return NextResponse.json(
                { success: false, error: 'Stakeholder record not found or inactive' },
                { status: 403 }
            );
        }

        const { data: stakeholders, error: listError } = await supabaseAdmin
            .from('stakeholders')
            .select(`
                id, full_name, email, role, wallet_address, is_active, phone, position,
                created_at, organization_id,
                organizations ( id, name, organization_type )
            `)
            .eq('organization_id', callerStakeholder.organization_id)
            .order('created_at', { ascending: false });

        if (listError) throw listError;
        return NextResponse.json({ success: true, stakeholders: stakeholders ?? [] });

    } catch (error: any) {
        console.error('Stakeholder GET API error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
