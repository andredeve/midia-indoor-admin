import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MonitorPlay, CheckCircle2, Play, Eye, BarChart3, Clock } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ 
    total: 0, 
    online: 0, 
    totalPlays: 0,
    activeNow: 0 
  });
  const [topMedia, setTopMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      // 1. Stats de Terminais
      const { data: terminals } = await supabase.from('terminals').select('status, last_seen_at');
      
      // 2. Total de Plays (últimas 24h)
      const { count: totalPlays } = await supabase
        .from('terminal_logs')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'playback_start');

      // 3. Top Mídias
      const { data: stats } = await supabase
        .from('playback_stats')
        .select('*, media:media_files(name)')
        .order('total_plays', { ascending: false })
        .limit(5);

      if (terminals) {
        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
        setStats({
          total: terminals.length,
          online: terminals.filter(t => t.status === 'online').length,
          totalPlays: totalPlays || 0,
          activeNow: terminals.filter(t => t.last_seen_at && new Date(t.last_seen_at) > threeMinutesAgo).length
        });
      }

      if (stats) {
        setTopMedia(stats);
      }
      
      setLoading(false);
    }
    loadDashboardData();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Métricas em Tempo Real</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Total de TVs */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', borderRadius: '8px' }}>
              <MonitorPlay size={24} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Terminais</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{loading ? '-' : stats.total}</div>
            </div>
          </div>
        </div>

        {/* TVs Online Agora */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', borderRadius: '8px' }}>
              <Clock size={24} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ativos Agora</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{loading ? '-' : stats.activeNow}</div>
            </div>
          </div>
        </div>

        {/* Total de Exibições */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', borderRadius: '8px' }}>
              <Play size={24} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Exibições</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{loading ? '-' : stats.totalPlays}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Tabela de Conteúdos mais vistos */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <BarChart3 size={20} color="var(--primary-color)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Ranking de Conteúdo</h2>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem 0', color: 'var(--text-muted)', fontWeight: 500 }}>Mídia</th>
                <th style={{ padding: '1rem 0', color: 'var(--text-muted)', fontWeight: 500 }}>Exibições</th>
                <th style={{ padding: '1rem 0', color: 'var(--text-muted)', fontWeight: 500 }}>Última vez</th>
              </tr>
            </thead>
            <tbody>
              {topMedia.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem 0', fontWeight: 500 }}>{item.media?.name || 'Mídia Removida'}</td>
                  <td style={{ padding: '1rem 0' }}>
                    <span style={{ backgroundColor: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.875rem' }}>
                      {item.total_plays}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {new Date(item.last_played_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {topMedia.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum dado de reprodução ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info lateral */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Dica do Sistema</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Os terminais enviam um sinal de atividade (heartbeat) a cada 60 segundos. Se um terminal ficar mais de 3 minutos sem enviar sinal, ele será considerado "Inativo" no gráfico de atividade.
          </p>
        </div>
      </div>
    </div>
  );
}
