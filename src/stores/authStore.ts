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
    // Bypass de desenvolvimento para adm@gymplay.com / 123
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === 'adm@gymplay.com') {
      if (password === '123') {
        const mockUser = {
          id: '00000000-0000-0000-0000-000000000000',
          email: 'adm@gymplay.com',
          user_metadata: {
            name: 'Administrador Local',
            role: 'admin',
          }
        } as any;
        try {
          localStorage.setItem('@is_mock_session', 'true');
        } catch (e) {
          console.error(e);
        }
        set({ user: mockUser });
        return { error: null };
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { error: error.message };
      set({ user: data.user });
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },
  signOut: async () => {
    try {
      localStorage.removeItem('@is_mock_session');
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
        const mockUser = {
          id: '00000000-0000-0000-0000-000000000000',
          email: 'adm@gymplay.com',
          user_metadata: {
            name: 'Administrador Local',
            role: 'admin',
          }
        } as any;
        set({ user: mockUser, loading: false });
        return;
      }
    } catch (e) {
      console.error(e);
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user || null, loading: false });
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      // Se tiver mock ativo, ignorar mudança silenciosa do supabase auth
      try {
        if (localStorage.getItem('@is_mock_session') === 'true') return;
      } catch {}
      set({ user: session?.user || null });
    });
  },
}));
