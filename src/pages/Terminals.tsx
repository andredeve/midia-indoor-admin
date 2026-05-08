import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { MonitorPlay, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Terminal {
  id: string;
  name: string;
  location: string;
  status: string;
  is_active: boolean;
  last_sync_at: string | null;
}

export default function Terminals() {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    async function loadTerminals() {
      // Pega o org_id do usuário logado
      const { data: userData } = await supabase.from('users').select('org_id').eq('id', user?.id).single();
      
      if (userData?.org_id) {
        const { data, error } = await supabase
          .from('terminals')
          .select('*')
          .eq('org_id', userData.org_id)
          .order('created_at', { ascending: false });
          
        if (data && !error) {
          setTerminals(data);
        }
      }
      setLoading(false);
    }
    loadTerminals();

    // Iniciar realtime subscription para status dos terminais
    const subscription = supabase
      .channel('terminals-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'terminals' }, (payload) => {
        setTerminals((current) => current.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Terminais (TVs)</h1>
        <button className="btn btn-primary">Adicionar Terminal</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="loader"></div>
        </div>
      ) : terminals.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Nenhum terminal cadastrado. Clique em Adicionar Terminal para começar.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {terminals.map(terminal => (
            <div key={terminal.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                    <MonitorPlay size={20} color="var(--primary-color)" />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 600 }}>{terminal.name}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{terminal.location || 'Sem localização'}</p>
                  </div>
                </div>
                {terminal.status === 'online' ? (
                  <CheckCircle2 size={20} color="var(--success-color)" />
                ) : (
                  <XCircle size={20} color="var(--danger-color)" />
                )}
              </div>
              
              <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1rem', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={14} />
                <span>Último sync: {terminal.last_sync_at 
                  ? formatDistanceToNow(new Date(terminal.last_sync_at), { addSuffix: true, locale: ptBR })
                  : 'Nunca'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
