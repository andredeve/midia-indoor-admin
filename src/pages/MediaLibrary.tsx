import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Upload, Film, Image as ImageIcon, Trash2, FileVideo } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MediaFile {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  publicUrl?: string;
}

export default function MediaLibrary() {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  const loadMedia = async () => {
    const { data: userData } = await supabase.from('users').select('org_id').eq('id', user?.id).single();
    if (userData?.org_id) {
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .eq('org_id', userData.org_id)
        .order('created_at', { ascending: false });
        
      if (data && !error) {
        // Buscar a URL pública do Storage para cada arquivo
        const mediaWithUrls = data.map(item => {
          const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(item.file_path);
          return { ...item, publicUrl: publicUrlData.publicUrl };
        });
        setMedia(mediaWithUrls);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMedia();
  }, [user]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    try {
      // 1. Fazer upload para o Storage
      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
      if (uploadError) throw uploadError;

      // 2. Gerar um checksum simples (tamanho + data) para versionamento offline
      const simpleChecksum = btoa(`${file.name}-${file.size}-${file.lastModified}`).substring(0, 32);

      // 3. Registrar no banco de dados
      const { data: userData } = await supabase.from('users').select('org_id').eq('id', user?.id).single();
      
      const { error: dbError } = await supabase.from('media_files').insert({
        org_id: userData?.org_id,
        name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        checksum: simpleChecksum
      });

      if (dbError) {
        console.error('Erro no DB:', dbError);
        throw dbError;
      }

      // Recarregar lista
      await loadMedia();
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao enviar o arquivo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteMedia = async (id: string, filePath: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta mídia?')) return;
    
    // 1. Excluir do storage
    await supabase.storage.from('media').remove([filePath]);
    // 2. Excluir do DB
    await supabase.from('media_files').delete().eq('id', id);
    
    // Recarregar
    setMedia(media.filter(m => m.id !== id));
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Biblioteca de Mídias</h1>
        <input 
          type="file" 
          accept="video/mp4,video/webm,image/jpeg,image/png,image/webp" 
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <button 
          className="btn btn-primary" 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <div className="loader"></div> : <Upload size={18} />}
          {uploading ? 'Enviando...' : 'Fazer Upload'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="loader"></div></div>
      ) : media.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
          <FileVideo size={48} color="var(--panel-border)" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Sua biblioteca está vazia.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Faça o upload do primeiro vídeo ou imagem para sua TV.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {media.map(item => (
            <div key={item.id} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '140px', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {item.file_type.includes('video') ? (
                  <>
                    <video src={item.publicUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                    <Film size={24} color="#fff" style={{ position: 'absolute' }} />
                  </>
                ) : (
                  <img src={item.publicUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              
              <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                    {item.name}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {(item.file_size / 1024 / 1024).toFixed(2)} MB • {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => deleteMedia(item.id, item.file_path)} className="btn btn-outline" style={{ padding: '0.35rem 0.5rem', color: 'var(--danger-color)', borderColor: 'transparent' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
