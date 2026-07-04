import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { MonitorPlay, Play, BarChart3, Clock } from 'lucide-react';

export default function Dashboard() {
  const [terminals, setTerminals] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedTerminalFilter, setSelectedTerminalFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { data: terminalsData } = await supabase.from('terminals').select('*');
        const { data: logsData } = await supabase
          .from('terminal_logs')
          .select('*')
          .eq('event_type', 'playback_start');

        setTerminals(terminalsData || []);
        setLogs(logsData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();

    // Inscrição em tempo real para novos logs de reprodução
    const subscription = supabase
      .channel('terminal-playback-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'terminal_logs', filter: 'event_type=eq.playback_start' }, (payload: any) => {
        setLogs((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const { filteredStats, ranking } = useMemo(() => {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    const activeTerminals = selectedTerminalFilter
      ? terminals.filter((t: any) => t.id === selectedTerminalFilter)
      : terminals;

    const filteredLogs = selectedTerminalFilter
      ? logs.filter((log: any) => log.terminal_id === selectedTerminalFilter)
      : logs;

    const total = activeTerminals.length;
    const online = activeTerminals.filter((t: any) => t.status === 'online').length;
    const activeNow = activeTerminals.filter((t: any) => t.last_seen_at && new Date(t.last_seen_at) > threeMinutesAgo).length;
    const totalPlays = filteredLogs.length;

    const mediaMap: Record<string, { name: string, total_plays: number, last_played_at: string }> = {};

    filteredLogs.forEach((log: any) => {
      const meta = log.metadata || {};
      const mediaId = meta.media_id || 'unknown';
      const mediaName = meta.media_name || 'Mídia Sem Nome';

      if (!mediaMap[mediaId]) {
        mediaMap[mediaId] = {
          name: mediaName,
          total_plays: 0,
          last_played_at: log.created_at
        };
      }

      mediaMap[mediaId].total_plays += 1;
      if (new Date(log.created_at) > new Date(mediaMap[mediaId].last_played_at)) {
        mediaMap[mediaId].last_played_at = log.created_at;
      }
    });

    const rankingData = Object.values(mediaMap).sort((a: any, b: any) => b.total_plays - a.total_plays);

    return {
      filteredStats: { total, online, activeNow, totalPlays },
      ranking: rankingData
    };
  }, [terminals, logs, selectedTerminalFilter]);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title">Métricas em Tempo Real</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Terminal:</label>
          <select 
            className="input-field" 
            style={{ width: '220px', padding: '0.5rem 1rem', height: 'auto', cursor: 'pointer' }}
            value={selectedTerminalFilter}
            onChange={(e) => setSelectedTerminalFilter(e.target.value)}
          >
            <option value="">Todos os Terminais</option>
            {terminals.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name} ({t.location || 'Sem local'})</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Total de TVs */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-glow)', color: 'var(--primary-color)', borderRadius: '12px' }}>
              <MonitorPlay size={24} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Terminais</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{loading ? '-' : filteredStats.total}</div>
            </div>
          </div>
        </div>

        {/* TVs Online Agora */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-glow)', color: 'var(--primary-color)', borderRadius: '12px' }}>
              <Clock size={24} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ativos Agora</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{loading ? '-' : filteredStats.activeNow}</div>
            </div>
          </div>
        </div>

        {/* Total de Exibições */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', borderRadius: '12px' }}>
              <Play size={24} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Exibições</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{loading ? '-' : filteredStats.totalPlays}</div>
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
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--panel-border)' }}>
                <th style={{ padding: '1rem 0', color: 'var(--text-muted)', fontWeight: 500 }}>Mídia</th>
                <th style={{ padding: '1rem 0', color: 'var(--text-muted)', fontWeight: 500 }}>Exibições</th>
                <th style={{ padding: '1rem 0', color: 'var(--text-muted)', fontWeight: 500 }}>Última vez</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '1rem 0', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '1rem 0' }}>
                    <span style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary-color)', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 600 }}>
                      {item.total_plays}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {new Date(item.last_played_at).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
              {ranking.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum dado de reprodução ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info lateral */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Dica do Systema</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Os terminais enviam um sinal de atividade (heartbeat) a cada 60 segundos. Se um terminal ficar mais de 3 minutos sem enviar sinal, ele será considerado "Inativo" no gráfico de atividade.
          </p>
        </div>
      </div>
    </div>
  );
}
