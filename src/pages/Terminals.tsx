import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { MonitorPlay, Clock, Edit2, Trash2, X, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Terminal {
  id: string;
  name: string;
  location: string;
  status: string;
  is_active: boolean;
  last_sync_at: string | null;
  org_id: string;
  device_info?: any;
}

export default function Terminals() {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    location: '',
    show_info_bar: true,
    establishment_name: '',
    advertisement_text: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuthStore();

  const loadTerminals = async () => {
    setLoading(true);
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
  };

  useEffect(() => {
    loadTerminals();

    const subscription = supabase
      .channel('terminals-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'terminals' }, () => {
        loadTerminals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const handleOpenModal = (terminal?: Terminal) => {
    if (terminal) {
      setEditingTerminal(terminal);
      const devInfo = terminal.device_info || {};
      setFormData({ 
        name: terminal.name, 
        location: terminal.location || '',
        show_info_bar: devInfo.show_info_bar !== false,
        establishment_name: devInfo.establishment_name || '',
        advertisement_text: devInfo.advertisement_text || ''
      });
    } else {
      setEditingTerminal(null);
      setFormData({ 
        name: '', 
        location: '',
        show_info_bar: true,
        establishment_name: '',
        advertisement_text: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { data: userData } = await supabase.from('users').select('org_id').eq('id', user?.id).single();
      
      if (!userData?.org_id) throw new Error('Organização não encontrada');

      const updatedDeviceInfo = editingTerminal 
        ? { ...(editingTerminal.device_info || {}), show_info_bar: formData.show_info_bar, establishment_name: formData.establishment_name, advertisement_text: formData.advertisement_text }
        : { show_info_bar: formData.show_info_bar, establishment_name: formData.establishment_name, advertisement_text: formData.advertisement_text };

      if (editingTerminal) {
        // Update
        const { error } = await supabase
          .from('terminals')
          .update({ 
            name: formData.name, 
            location: formData.location,
            device_info: updatedDeviceInfo
          })
          .eq('id', editingTerminal.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('terminals')
          .insert([{ 
            name: formData.name, 
            location: formData.location, 
            org_id: userData.org_id,
            status: 'offline',
            is_active: true,
            device_info: updatedDeviceInfo
          }]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      loadTerminals();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao salvar terminal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este terminal?')) return;

    const { error } = await supabase.from('terminals').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir terminal');
    } else {
      loadTerminals();
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Terminais (TVs)</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          Adicionar Terminal
        </button>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="icon-btn" onClick={() => handleOpenModal(terminal)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="icon-btn text-danger" onClick={() => handleDelete(terminal.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: terminal.status === 'online' ? 'var(--success-color)' : 'var(--danger-color)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: terminal.status === 'online' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                    {terminal.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  <span>Sync: {terminal.last_sync_at 
                    ? formatDistanceToNow(new Date(terminal.last_sync_at), { addSuffix: true, locale: ptBR })
                    : 'Nunca'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Formulário */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ width: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {editingTerminal ? 'Editar Terminal' : 'Novo Terminal'}
              </h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Nome do Terminal</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Recepção, Corredor..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Localização / Unidade</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Unidade Centro, Andar 2..."
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginTop: '1.25rem', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="show_info_bar"
                  checked={formData.show_info_bar}
                  onChange={(e) => setFormData({ ...formData, show_info_bar: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="show_info_bar" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>Exibir Barra de Informações na TV</label>
              </div>

              {formData.show_info_bar && (
                <>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label className="form-label">Nome do Estabelecimento</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ex: Academia GymPlay Centro"
                      value={formData.establishment_name}
                      onChange={(e) => setFormData({ ...formData, establishment_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label className="form-label">Texto do Anúncio (Letreiro)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ex: Fale conosco pelo telefone: (11) 99676-1571..."
                      value={formData.advertisement_text}
                      onChange={(e) => setFormData({ ...formData, advertisement_text: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar Terminal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          animation: modalAppear 0.3s ease-out;
        }
        @keyframes modalAppear {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .icon-btn {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: var(--text-muted);
          padding: 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .icon-btn.text-danger:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger-color);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
}
