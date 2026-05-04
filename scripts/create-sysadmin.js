const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = 'admin@gmail.com';
  const password = 'password'; // Use a strong password in production!
  
  // Create user
  console.log(`Creating user ${email}...`);
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  if (userError) {
    if (userError.message.includes('already been registered') || userError.message.includes('already exists')) {
        console.log('User already exists. Proceeding to update/ensure admin status...');
    } else {
        console.error('Error creating auth user:', userError);
        return;
    }
  }

  // Get user 
  const { data: { users }, error: fetchError } = await supabase.auth.admin.listUsers();
  
  if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return;
  }
  
  const authUser = users.find(u => u.email === email);
  
  if (!authUser) {
      console.error('Could not find created user in listUsers');
      return;
  }
  
  const userId = authUser.id;
  console.log(`User ID: ${userId}`);

  // Insert into admin_users 
  console.log(`Registering as Sysadmin in database...`);
  const { error: dbError } = await supabase
    .from('admin_users')
    .upsert({
      id: userId,
      full_name: 'Sys Admin',
      email: email,
      is_active: true,
      can_manage_organizations: true,
      can_manage_stakeholders: true
    });

  if (dbError) {
    console.error('Error inserting into admin_users:', dbError);
  } else {
    console.log('Sysadmin successfully created and registered in admin_users table!');
  }
}

main().catch(console.error);
