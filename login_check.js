const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://prlhdjpzflgjtlmknhps.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybGhkanB6ZmxnanRsbWtuaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjIxMjMsImV4cCI6MjA5MzgzODEyM30.Xu2q_acI-Ow3kzJl0jFGdqnuCiRu4vjtpa-eaQBVU0c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('--- Logging in adm@gymplay.com ---');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'adm@gymplay.com',
    password: '96761571'
  });

  if (error) {
    console.error('Login error:', error);
    return;
  }

  const user = data.user;
  console.log('Logged in successfully! User ID:', user.id);

  console.log('--- Checking public.users table ---');
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id);

  if (dbError) {
    console.error('Database query error:', dbError);
    return;
  }

  console.log('Database user record:', dbUser);

  if (dbUser.length === 0) {
    console.log('No user record found in public.users! We need to create one.');
    
    // Check organizations
    console.log('--- Checking organizations ---');
    const { data: orgs, error: orgError } = await supabase.from('organizations').select('*');
    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      return;
    }
    console.log('Organizations:', orgs);
    
    let orgId = orgs?.[0]?.id;
    if (!orgId) {
      console.log('No organization found! Creating one...');
      const { data: newOrg, error: newOrgError } = await supabase
        .from('organizations')
        .insert({ name: 'GymPlay', slug: 'gymplay' })
        .select();
      if (newOrgError) {
        console.error('Error creating organization:', newOrgError);
        return;
      }
      orgId = newOrg[0].id;
      console.log('Created organization with ID:', orgId);
    }

    console.log('--- Inserting user record ---');
    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: 'Administrador GymPlay',
        role: 'admin',
        org_id: orgId
      })
      .select();
    if (insertError) {
      console.error('Error inserting user:', insertError);
    } else {
      console.log('User record inserted successfully:', insertedUser);
    }
  }
}

run();
