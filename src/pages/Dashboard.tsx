import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MonitorPlay, CheckCircle2, XCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const { data, error } = await supabase.from('terminals').select('status');
      if (data && !error) {
        setStats({
          total: data.length,
          online: data.filter(t => t.status === 'online').length,
          offline: data.filter(t => t.status === 'offline').length,
        });
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Visão Geral</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Card 1 */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', borderRadius: '8px' }}>
              <MonitorPlay size={24} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total de TVs</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{loading ? '-' : stats.total}</div>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', borderRadius: '8px' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>TVs Online</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{loading ? '-' : stats.online}</div>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', borderRadius: '8px' }}>
              <XCircle size={24} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>TVs Offline</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{loading ? '-' : stats.offline}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Em breve: Mais funcionalidades e telas como "Biblioteca de Mídias" e "Playlists" serão adicionadas aqui!</p>
      </div>
    </div>
  );
}
