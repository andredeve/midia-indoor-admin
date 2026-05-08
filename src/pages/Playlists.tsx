import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { ListVideo, Plus, Trash2, Video, Tv } from 'lucide-react';

export default function Playlists() {
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  
  // States para o form de nova playlist
  const [showForm, setShowForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedTerminal, setSelectedTerminal] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.from('users').select('org_id').eq('id', user?.id).single();
      if (!userData) return;

      // Buscar terminais para o dropdown
      const { data: tData } = await supabase.from('terminals').select('*').eq('org_id', userData.org_id);
      
      let pData: any[] = [];
      if (tData && tData.length > 0) {
        const terminalIds = tData.map(t => t.id);
        // Buscar playlists existentes vinculadas aos terminais do org
        const { data } = await supabase
          .from('playlists')
          .select('*, terminals(name), playlist_items(media_id)')
          .in('terminal_id', terminalIds)
          .order('created_at', { ascending: false });
        pData = data || [];
      }
      
      // Buscar mídias disponíveis
      const { data: mData } = await supabase.from('media_files').select('*').eq('org_id', userData.org_id);

      if (pData) setPlaylists(pData);
      if (tData) setTerminals(tData);
      if (mData) setMediaFiles(mData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlaylistName || !selectedTerminal || selectedMedia.length === 0) {
      alert('Preencha nome, terminal e selecione ao menos uma mídia.');
      return;
    }

    try {
      const { data: userData } = await supabase.from('users').select('org_id').eq('id', user?.id).single();
      
      // Desativar playlist anterior deste terminal
      await supabase.from('playlists').update({ is_active: false }).eq('terminal_id', selectedTerminal);

      // Criar a nova playlist
      const { data: newPlaylist, error: pError } = await supabase.from('playlists').insert({
        terminal_id: selectedTerminal,
        name: newPlaylistName,
        is_active: true,
        version: 1
      }).select().single();

      if (pError) throw pError;

      // Inserir os itens na playlist
      const itemsToInsert = selectedMedia.map((mediaId, index) => ({
        playlist_id: newPlaylist.id,
        media_id: mediaId,
        order: index + 1,
        duration_override: 15 // Padrão 15 segundos para imagens, vídeos usam duração natural
      }));

      const { error: iError } = await supabase.from('playlist_items').insert(itemsToInsert);
      if (iError) throw iError;

      // Limpar form e recarregar
      setNewPlaylistName('');
      setSelectedTerminal('');
      setSelectedMedia([]);
      setShowForm(false);
      loadData();
      
      alert('Playlist criada com sucesso! O terminal começará a baixar os arquivos.');

    } catch (error) {
      console.error(error);
      alert('Erro ao criar playlist. Verifique o console.');
    }
  }

  async function deletePlaylist(id: string) {
    if (!confirm('Tem certeza que deseja apagar esta playlist?')) return;
    await supabase.from('playlists').delete().eq('id', id);
    loadData();
  }

  const toggleMediaSelection = (mediaId: string) => {
    setSelectedMedia(prev => 
      prev.includes(mediaId) ? prev.filter(id => id !== mediaId) : [...prev, mediaId]
    );
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="loader" style={{margin: '0 auto', borderColor: 'var(--primary) transparent var(--primary) transparent'}} /></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gerenciar Playlists</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Cancelar' : 'Nova Playlist'}
        </button>
      </div>

      {showForm && (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Criar Nova Playlist</h2>
          <form onSubmit={handleCreatePlaylist}>
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nome da Playlist</label>
                <input 
                  type="text" 
                  value={newPlaylistName} 
                  onChange={e => setNewPlaylistName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', color: 'white' }}
                  placeholder="Ex: Promoções de Verão"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Vincular a qual Terminal (TV)?</label>
                <select 
                  value={selectedTerminal} 
                  onChange={e => setSelectedTerminal(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', color: 'white' }}
                >
                  <option value="" style={{ color: 'black' }}>-- Selecione um Terminal --</option>
                  {terminals.map(t => (
                    <option key={t.id} value={t.id} style={{ color: 'black' }}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Selecione as Mídias (Ordem de Seleção = Ordem de Reprodução)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {mediaFiles.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Nenhuma mídia na biblioteca. Faça upload primeiro.</p>
              ) : (
                mediaFiles.map(media => {
                  const isSelected = selectedMedia.includes(media.id);
                  const orderIndex = selectedMedia.indexOf(media.id) + 1;
                  return (
                    <div 
                      key={media.id} 
                      onClick={() => toggleMediaSelection(media.id)}
                      style={{ 
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--panel-border)', 
                        borderRadius: '8px', 
                        padding: '1rem', 
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                        position: 'relative'
                      }}
                    >
                      {isSelected && (
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--primary)', color: 'black', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {orderIndex}
                        </div>
                      )}
                      <Video size={24} style={{ marginBottom: '0.5rem', color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }} />
                      <p style={{ fontSize: '0.85rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.name}</p>
                    </div>
                  );
                })
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Salvar Playlist e Sincronizar
            </button>
          </form>
        </div>
      )}

      {playlists.length === 0 && !showForm ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <ListVideo size={48} color="var(--panel-border)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Nenhuma Playlist Criada</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
            Crie sua primeira lista de reprodução para começar a enviar conteúdo para suas telas.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {playlists.map(playlist => (
            <div key={playlist.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
              <div>
                <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                  {playlist.name} 
                  {playlist.is_active && <span style={{ fontSize: '0.7rem', background: 'var(--success)', color: 'black', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>ATIVA</span>}
                </h3>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Tv size={14} /> {playlist.terminals?.name || 'Nenhum Terminal'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Video size={14} /> {playlist.playlist_items?.length || 0} mídias</span>
                </div>
              </div>
              
              <button 
                onClick={() => deletePlaylist(playlist.id)}
                style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '0.5rem' }}
                title="Apagar Playlist"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
