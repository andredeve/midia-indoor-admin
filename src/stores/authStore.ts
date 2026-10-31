import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  initialize: () => void;
}

async function fetchUserRole(userId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    return data?.role || 'operator';
  } catch {
    return 'operator';
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userRole: null,
  loading: true,
  signIn: async (email, password) => {
    try {
      // Limpa sessão mock antes de tentar login real
      try {
        localStorage.removeItem('@is_mock_session');
        localStorage.removeItem('@mock_email');
      } catch {}

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('[Auth] SignIn error:', error.message);
        return { error: error.message };
      }

      if (!data?.user) {
        return { error: 'Credenciais inválidas.' };
      }

      console.log('[Auth] Login OK, fetching role...');
      const role = await fetchUserRole(data.user.id);
      console.log('[Auth] Role:', role);

      set({ user: data.user, userRole: role, loading: false });
      return { error: null };
    } catch (err: any) {
      console.error('[Auth] Exception:', err);
      return { error: err.message || 'Erro ao conectar ao servidor.' };
    }
  },
  signOut: async () => {
    try {
      localStorage.removeItem('@is_mock_session');
      localStorage.removeItem('@mock_email');
    } catch {}
    await supabase.auth.signOut();
    set({ user: null, userRole: null, loading: false });
  },
  initialize: () => {
    // Tenta restaurar sessão ativa com timeout de 3s
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
      setTimeout(() => resolve({ data: { session: null } }), 3000)
    );

    Promise.race([sessionPromise, timeoutPromise])
      .then(async ({ data: { session } }: any) => {
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          set({ user: session.user, userRole: role, loading: false });
        } else {
          set({ user: null, userRole: null, loading: false });
        }
      })
      .catch(() => {
        set({ user: null, userRole: null, loading: false });
      });
  },
}));
