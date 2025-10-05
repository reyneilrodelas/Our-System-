import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/env';

if (!ENV.SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
if (!ENV.SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY');

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
    },
})

// supabase.auth.onAuthStateChange((event, session) => {
//     console.log('Supabase auth event:', event);
//     console.log('Session:', session);
// });