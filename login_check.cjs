const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://prlhdjpzflgjtlmknhps.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybGhkanB6ZmxnanRsbWtuaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjIxMjMsImV4cCI6MjA5MzgzODEyM30.Xu2q_acI-Ow3kzJl0jFGdqnuCiRu4vjtpa-eaQBVU0c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('--- Logging in adm@gymplay.com ---');
  await supabase.auth.signInWithPassword({
    email: 'adm@gymplay.com',
    password: '96761571'
  });

  console.log('--- Deleting specific invalid log ---');
  const { data, error } = await supabase
    .from('terminal_logs')
    .delete()
    .eq('id', '9c3d4d9a-01c2-4bae-b593-7158803442c7')
    .select();

  console.log('Delete error:', error);
  console.log('Delete result:', data);
}

run();
