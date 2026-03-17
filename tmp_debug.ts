import { supabaseAdmin } from './src/lib/supabase';

async function debugData() {
  console.log('--- DEBUG DATA ---');
  
  const { data: teams, error: tError } = await supabaseAdmin.from('team').select('*');
  if (tError) console.error('Teams Error:', tError);
  else {
    console.log('TEAMS:');
    teams.forEach(t => console.log(`- ID: ${t.id}, Name: ${t.name}, Matricula: ${t.matricula}`));
  }

  const { data: incidents, error: iError } = await supabaseAdmin.from('incident').select('*').neq('status', 'COMPLETED');
  if (iError) console.error('Incidents Error:', iError);
  else {
    console.log('\nACTIVE INCIDENTS:');
    incidents.forEach(i => console.log(`- ID: ${i.id}, Title: ${i.title}, TeamID: ${i.team_id}`));
  }
}

debugData();
