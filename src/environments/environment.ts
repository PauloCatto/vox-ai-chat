import { config } from 'dotenv';
config();

export const environment = {
  production: false,
  supabaseUrl: process.env['SUPABASE_URL'] || '',
  supabaseKey: process.env['SUPABASE_ANON_KEY'] || '',
};
