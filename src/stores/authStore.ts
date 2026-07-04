import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  signIn: async (email, password) => {
    try {
      // 1. Tenta fazer login real no Supabase primeiro
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!error && data.user) {
        try {
          localStorage.removeItem('@is_mock_session');
          localStorage.removeItem('@mock_email');
        } catch {}
        set({ user: data.user });
        return { error: null };
      }

      return { error: error?.message || 'Credenciais inválidas. Tente novamente.' };
    } catch (err: any) {
      return { error: err.message || 'Erro ao conectar ao servidor.' };
    }
  },
  signOut: async () => {
    try {
      localStorage.removeItem('@is_mock_session');
      localStorage.removeItem('@mock_email');
    } catch (e) {
      console.error(e);
    }
    await supabase.auth.signOut();
    set({ user: null });
  },
  initialize: () => {
    // Verificar sessão mock primeiro
    try {
      if (localStorage.getItem('@is_mock_session') === 'true') {
        const mockEmail = localStorage.getItem('@mock_email') || 'adm@gymplay.com';
        const mockUser = {
          id: '00000000-0000-0000-0000-000000000000',
          email: mockEmail,
          user_metadata: {
            name: 'Administrador Local (Offline)',
            role: 'admin',
          }
        } as any;
        set({ user: mockUser, loading: false });
        return;
      }
    } catch (e) {
      console.error(e);
    }

    // Check active session with a 1000ms timeout to prevent hanging when offline
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
      setTimeout(() => resolve({ data: { session: null } }), 1000)
    );

    Promise.race([sessionPromise, timeoutPromise])
      .then(({ data: { session } }) => {
        set({ user: session?.user || null, loading: false });
      })
      .catch(() => {
        set({ user: null, loading: false });
      });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event: any, session: any) => {
      // Se tiver mock ativo, ignorar mudança silenciosa do supabase auth
      try {
        if (localStorage.getItem('@is_mock_session') === 'true') return;
      } catch {}
      set({ user: session?.user || null });
    });
  },
}));
