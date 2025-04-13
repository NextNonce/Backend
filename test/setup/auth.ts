import { SupabaseClient } from '@supabase/supabase-js';

class AuthProvider {
    private supabase: SupabaseClient;
    constructor(supabaseUrl: string, supabaseKey: string) {
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase URL or key is not defined');
        }
        this.supabase = new SupabaseClient(supabaseUrl, supabaseKey);
    }
    async registerTestUser() {
        const randomNumber = Math.floor(Math.random() * 100000);
        const email = `testuser_${Date.now()}_${randomNumber}@nextnonce.com`; // Unique email for each test run
        const password = 'testpassword123';
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
        });
        if (error) {
            console.log(`Supabase signup failed: ${JSON.stringify(error)}`);
            throw error;
        }
        if (!data.session) {
            throw new Error('Supabase signup did not return a session');
        }
        return { email, password, token: data.session.access_token };
    }

    async loginTestUser(email: string, password: string) {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw new Error(`Supabase login failed: ${error.message}`);
        if (!data.session) {
            throw new Error('Supabase login did not return a session');
        }
        return data.session.access_token;
    }

    async updateTestUserEmail(token: string, newEmail: string) {
        const { data, error } = await this.supabase.auth.updateUser({
            email: newEmail,
        });
        if (error)
            throw new Error(`Supabase updateUser failed: ${error.message}`);
        if (!data.user)
            throw new Error('Supabase updateUser did not return a user');
        return data.user.new_email; // Should now return the new email
    }
}

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_ANON_KEY as string;
export const authProvider = new AuthProvider(supabaseUrl, supabaseKey);
