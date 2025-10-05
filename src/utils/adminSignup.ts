// Create a separate utility file adminSignup.ts
import { supabase } from '../lib/supabase';

export async function createAdminUser(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
        email: 'reyneilrodelas29@gmail.com',
        password: 'AdImIn@_26',
        options: {
            data: {
                role: 'admin',
                name: 'Admin User'
            }
        }
    });

    if (error) {
        console.error('Error creating admin:', error);
        return null;
    }

    console.log('Admin user created:', data.user?.email);
    return data.user;
}

// Call this function once to create your admin user
// createAdminUser('admin@example.com', 'securepassword');