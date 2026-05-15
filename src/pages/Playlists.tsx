import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { ListVideo, Plus, Trash2, Video, Tv, Edit2, X } from 'lucide-react';

export default function Playlists() {
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  
  // States para o form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState('');
  const [selectedTerminal, setSelectedTerminal] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const { user } = useAuthStore();

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.from('users').select('org_id').eq('id', user?.id).single();
      if (!userData) return;

      const { data: tData } = await supabase.from('terminals').select('*').eq('org_id', userData.org_id);
      
      let pData: any[] = [];
      if (tData && tData.length > 0) {
        const terminalIds = tData.map(t => t.id);
        const { data } = await supabase
          .from('playlists')
          .select('*, terminals(name), playlist_items(media_id, order)')
          .in('terminal_id', terminalIds)
          .order('created_at', { ascending: false });
        pData = data || [];
      }
      
      const { data: mData } = await supabase.from('media_files').select('*').eq('org_id', userData.org_id);

      setPlaylists(pData);
      setTerminals(tData || []);
      setMediaFiles(mData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const handleEdit = (playlist: any) => {
    setEditingId(playlist.id);
    setPlaylistName(playlist.name);
    setSelectedTerminal(playlist.terminal_id);
    
    // Pegar IDs das mídias ordenadas
    const mediaIds = [...playlist.playlist_items]
      .sort((a, b) => a.order - b.order)
      .map(item => item.media_id);
    
    setSelectedMedia(mediaIds);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setPlaylistName('');
    setSelectedTerminal('');
    setSelectedMedia([]);
  };

  const handleSavePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistName || !selectedTerminal || selectedMedia.length === 0) {
      alert('Preencha nome, terminal e selecione ao menos uma mídia.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        // MODO EDIÇÃO
        // 1. Atualizar dados básicos e incrementar versão
        const { data: currentPlaylist } = await supabase.from('playlists').select('version').eq('id', editingId).single();
        const nextVersion = (currentPlaylist?.version || 1) + 1;

        const { error: pError } = await supabase.from('playlists').update({
          name: playlistName,
          terminal_id: selectedTerminal,
          version: nextVersion,
          is_active: true
        }).eq('id', editingId);

        if (pError) throw pError;

        // 2. Substituir itens (delete + insert)
        await supabase.from('playlist_items').delete().eq('playlist_id', editingId);
        
        const itemsToInsert = selectedMedia.map((mediaId, index) => ({
          playlist_id: editingId,
          media_id: mediaId,
          order: index + 1,
          duration_override: 15
        }));

        const { error: iError } = await supabase.from('playlist_items').insert(itemsToInsert);
        if (iError) throw iError;

        alert('Playlist atualizada! O terminal irá sincronizar em instantes.');
      } else {
        // MODO CRIAÇÃO
        // Desativar outras playlists do terminal
        await supabase.from('playlists').update({ is_active: false }).eq('terminal_id', selectedTerminal);

        const { data: newPlaylist, error: pError } = await supabase.from('playlists').insert({
          terminal_id: selectedTerminal,
          name: playlistName,
          is_active: true,
          version: 1
        }).select().single();

        if (pError) throw pError;

        const itemsToInsert = selectedMedia.map((mediaId, index) => ({
          playlist_id: newPlaylist.id,
          media_id: mediaId,
          order: index + 1,
          duration_override: 15
        }));

        const { error: iError } = await supabase.from('playlist_items').insert(itemsToInsert);
        if (iError) throw iError;

        alert('Playlist criada com sucesso!');
      }

      handleCancel();
      loadData();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar playlist.');
    } finally {
      setIsSaving(false);
    }
  };

  const deletePlaylist = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar esta playlist?')) return;
    await supabase.from('playlists').delete().eq('id', id);
    loadData();
  };

  const toggleMediaSelection = (mediaId: string) => {
    setSelectedMedia(prev => 
      prev.includes(mediaId) ? prev.filter(id => id !== mediaId) : [...prev, mediaId]
    );
  };

  if (loading && !showForm) return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="loader" style={{margin: '0 auto'}} /></div>;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <div className="page-header">
        <h1 className="page-title">Playlists</h1>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Nova Playlist
          </button>
        )}
      </div>

      {showForm && (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
              {editingId ? 'Editando Playlist' : 'Nova Playlist'}
            </h2>
            <button className="icon-btn" onClick={handleCancel}><X size={24} /></button>
          </div>

          <form onSubmit={handleSavePlaylist}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <label className="form-label">Nome da Playlist</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={playlistName} 
                  onChange={e => setPlaylistName(e.target.value)}
                  placeholder="Ex: Menu do Dia"
                  required
                />
              </div>
              <div>
                <label className="form-label">Terminal Vinculado</label>
                <select 
                  className="form-input"
                  value={selectedTerminal} 
                  onChange={e => setSelectedTerminal(e.target.value)}
                  required
                >
                  <option value="" style={{ color: 'black' }}>Selecione uma TV...</option>
                  {terminals.map(t => (
                    <option key={t.id} value={t.id} style={{ color: 'black' }}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'white' }}>Selecione as Mídias</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Clique nas mídias para adicionar/remover. A ordem de seleção define a ordem de reprodução.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {mediaFiles.map(media => {
                const isSelected = selectedMedia.includes(media.id);
                const orderIndex = selectedMedia.indexOf(media.id) + 1;
                return (
                  <div 
                    key={media.id} 
                    onClick={() => toggleMediaSelection(media.id)}
                    style={{ 
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--panel-border)', 
                      borderRadius: '12px', 
                      padding: '1rem', 
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                      position: 'relative',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isSelected && (
                      <div style={{ 
                        position: 'absolute', top: '-8px', right: '-8px', 
                        background: 'var(--primary)', color: 'black', 
                        width: '28px', height: '28px', borderRadius: '50%', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 0 10px var(--primary)'
                      }}>
                        {orderIndex}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Video size={20} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{ fontSize: '0.9rem', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{media.name}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{media.file_type.split('/')[1].toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={handleCancel}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={isSaving}>
                {isSaving ? 'Salvando...' : editingId ? 'Atualizar Playlist' : 'Criar Playlist'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {playlists.map(playlist => (
          <div key={playlist.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px' }}>
                <ListVideo size={24} color="var(--primary)" />
              </div>
              <div>
                <h3 style={{ color: 'white', fontWeight: 700, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {playlist.name}
                  {playlist.is_active && <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--success-color)', color: 'black', padding: '2px 8px', borderRadius: '20px' }}>ATIVA</span>}
                </h3>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <Tv size={14} /> {playlist.terminals?.name || 'Sem terminal'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <Video size={14} /> {playlist.playlist_items?.length || 0} mídias
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    v{playlist.version}
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="icon-btn" onClick={() => handleEdit(playlist)} title="Editar Playlist">
                <Edit2 size={18} />
              </button>
              <button className="icon-btn text-danger" onClick={() => deletePlaylist(playlist.id)} title="Excluir Playlist">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        .icon-btn {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: var(--text-muted);
          padding: 0.6rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          transform: translateY(-2px);
        }
        .icon-btn.text-danger:hover {
          color: var(--danger-color);
          background: rgba(239, 68, 68, 0.1);
        }
        .form-label { display: block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem; }
        .form-input { 
          width: 100%; 
          padding: 0.8rem; 
          border-radius: 8px; 
          background: rgba(255,255,255,0.03); 
          border: 1px solid var(--panel-border); 
          color: white;
          outline: none;
        }
        .form-input:focus { border-color: var(--primary); }
      `}</style>
    </div>
  );
}
