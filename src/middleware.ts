import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * STAKEHOLDER-BASED ACCESS CONTROL MIDDLEWARE
 * Authenticates users based on stakeholder roles
 * Hierarchical: Organizations (parent) → Stakeholders (child)
 */

// Define credential-based route access rules
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard/manufacturer': ['manufacturer'],
  '/dashboard/distributor': ['distributor'],
  '/dashboard/logistics': ['logistics'],
  '/dashboard/pharmacy': ['pharmacy'],
  '/dashboard/regulator': ['regulator'],
  '/dashboard/admin': ['admin'],
  '/dashboard/analytics': ['manufacturer', 'regulator', 'admin'],
  // Generic dashboard route allows all authenticated users
  '/dashboard': ['manufacturer', 'distributor', 'logistics', 'pharmacy', 'regulator', 'admin'],
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  // Create Supabase client for middleware (Edge runtime compatible)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth token
  const { data: { user } } = await supabase.auth.getUser();
  
  const pathname = request.nextUrl.pathname;
  
  // Check if this is a protected dashboard route
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  if (matchedRoute) {
    if (!user) {
      // Not authenticated - redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      console.log(`[CBAC Middleware] Unauthenticated access attempt to ${pathname}`);
      return NextResponse.redirect(url);
    }
    
    // Check if user is admin
    const isAdmin = user.user_metadata?.is_admin === true;
    
    if (isAdmin && matchedRoute.includes('/admin')) {
      console.log(`[CBAC Middleware] Admin access granted to ${pathname}`);
      return response;
    }
    
    // For stakeholder users, verify stakeholder and organization
    if (!isAdmin) {
      // Get stakeholder role from metadata (set during login)
      let stakeholderRole = user.user_metadata?.role as string | undefined;
      let organizationType = user.user_metadata?.organization_type as string | undefined;

      // If not in metadata, fetch from stakeholder record
      if (!stakeholderRole || !organizationType) {
        const { data: stakeholder, error } = await supabase
          .from('stakeholders')
          .select(`
            role,
            is_active,
            organization:organizations(id, organization_type, is_active)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (error || !stakeholder) {
          console.warn(`[CBAC Middleware] Stakeholder not found for user ${user.email}`);
          const url = request.nextUrl.clone();
          url.pathname = '/login';
          url.searchParams.set('error', 'no_stakeholder');
          return NextResponse.redirect(url);
        }

        stakeholderRole = stakeholder.role;
        const org = stakeholder.organization as any;
        organizationType = org?.organization_type;

        // Verify organization is active
        if (!org || !org.is_active) {
          console.warn(`[CBAC Middleware] Organization is not active for user ${user.email}`);
          const url = request.nextUrl.clone();
          url.pathname = '/login';
          url.searchParams.set('error', 'inactive_organization');
          return NextResponse.redirect(url);
        }
      }
      
      // Check if stakeholder role matches route
      const allowedTypes = ROUTE_PERMISSIONS[matchedRoute];
      
      if (!stakeholderRole || !allowedTypes.includes(stakeholderRole)) {
        console.warn(`[CBAC Middleware] Unauthorized access attempt to ${pathname} by role: ${stakeholderRole}`);
        const url = request.nextUrl.clone();
        url.pathname = getDefaultDashboardForOrgType(stakeholderRole);
        url.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(url);
      }
      
      console.log(`[CBAC Middleware] Access granted to ${pathname} for role ${stakeholderRole}`);
    }
  }
  
  return response;
}

/**
 * Get default dashboard route for an organization type
 */
function getDefaultDashboardForOrgType(orgType: string | undefined): string {
  const dashboardMap: Record<string, string> = {
    manufacturer: '/dashboard/manufacturer',
    distributor: '/dashboard/distributor',
    logistics: '/dashboard/logistics',
    pharmacy: '/dashboard/pharmacy',
    regulator: '/dashboard/regulator',
    admin: '/dashboard/admin',
  };
  
  return dashboardMap[orgType || ''] || '/dashboard';
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
