import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import {
  Briefcase,
  Plus,
  UserCheck,
  X,
  Trash2,
  Edit2,
  Search,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Film,
  Image as ImageIcon,
  Check,
  Link,
  Percent
} from 'lucide-react';

interface Advertiser {
  id: string;
  user_id: string;
  company_name: string;
  partner_id: string | null;
  created_at: string;
  users?: {
    email: string;
  };
  partners?: {
    users?: {
      email: string;
    };
  };
}

interface Partner {
  id: string;
  establishment_name?: string;
  users?: {
    email: string;
  };
}

export default function AdvertiserManagement() {
  const { user } = useAuthStore();
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Create state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Edit state
  const [editingAdvertiser, setEditingAdvertiser] = useState<Advertiser | null>(null);
  const [editPartnerId, setEditPartnerId] = useState('');

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'linked' | 'direct'>('all');

  // Media Modal State
  const [selectedAdvForMedia, setSelectedAdvForMedia] = useState<Advertiser | null>(null);
  const [advMediaList, setAdvMediaList] = useState<any[]>([]);
  const [libraryMedias, setLibraryMedias] = useState<any[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState('');
  const [mediaModalLoading, setMediaModalLoading] = useState(false);
  const [allMediaCounts, setAllMediaCounts] = useState<Record<string, number>>({});

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [advRes, partRes, mediaRes] = await Promise.all([
        supabase
          .from('advertisers')
          .select('*, users(email), partners!advertisers_partner_id_fkey(users(email))')
          .order('created_at', { ascending: false }),
        supabase
          .from('partners')
          .select('*, users(email)'),
        supabase
          .from('media_files')
          .select('id, advertiser_id')
      ]);

      if (advRes.data) {
        setAdvertisers(advRes.data as Advertiser[]);
      } else if (advRes.error) {
        console.error('Error loading advertisers:', advRes.error);
      }

      if (partRes.data) {
        setPartners(partRes.data as Partner[]);
      }

      if (mediaRes.data) {
        const counts: Record<string, number> = {};
        mediaRes.data.forEach((m: any) => {
          if (m.advertiser_id) {
            counts[m.advertiser_id] = (counts[m.advertiser_id] || 0) + 1;
          }
        });
        setAllMediaCounts(counts);
      }
    } catch (err) {
      console.error('Erro geral ao carregar anunciantes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const partnerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    partners.forEach(p => {
      const label = p.establishment_name || p.users?.email || p.id.slice(0, 8);
      map.set(p.id, label);
    });
    return map;
  }, [partners]);

  const loadAdvMedias = async (advId: string) => {
    const { data } = await supabase
      .from('media_files')
      .select('*')
      .eq('advertiser_id', advId)
      .order('created_at', { ascending: false });
    if (data) {
      setAdvMediaList(data);
      setAllMediaCounts(prev => ({ ...prev, [advId]: data.length }));
    }
  };

  const loadLibraryMedias = async () => {
    const { data } = await supabase
      .from('media_files')
      .select('id, name, original_name, file_type, advertiser_id')
      .order('created_at', { ascending: false });
    if (data) setLibraryMedias(data);
  };

  const handleOpenMediaModal = async (adv: Advertiser) => {
    setSelectedAdvForMedia(adv);
    setMediaModalLoading(true);
    await loadAdvMedias(adv.id);
    await loadLibraryMedias();
    setMediaModalLoading(false);
  };

  const handleLinkMediaToAdv = async (mediaId: string) => {
    if (!selectedAdvForMedia || !mediaId) return;
    const { error } = await supabase
      .from('media_files')
      .update({ advertiser_id: selectedAdvForMedia.id, status: 'approved' })
      .eq('id', mediaId);
    if (!error) {
      await loadAdvMedias(selectedAdvForMedia.id);
      await loadLibraryMedias();
      setSelectedLibraryId('');
    } else {
      alert('Erro ao vincular mídia: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleUnlinkMedia = async (mediaId: string) => {
    if (!selectedAdvForMedia) return;
    const { error } = await supabase
      .from('media_files')
      .update({ advertiser_id: null })
      .eq('id', mediaId);
    if (!error) {
      await loadAdvMedias(selectedAdvForMedia.id);
      await loadLibraryMedias();
    }
  };

  const handleUpdateMediaStatus = async (mediaId: string, newStatus: 'approved' | 'rejected') => {
    if (!selectedAdvForMedia) return;
    const { error } = await supabase
      .from('media_files')
      .update({ status: newStatus })
      .eq('id', mediaId);
    if (!error) {
      await loadAdvMedias(selectedAdvForMedia.id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAdvertisers = useMemo(() => {
    return advertisers.filter(adv => {
      const q = searchQuery.toLowerCase().trim();
      const companyMatch = adv.company_name?.toLowerCase().includes(q) || false;
      const emailMatch = adv.users?.email?.toLowerCase().includes(q) || false;
      const partnerLabel = adv.partner_id ? (partnerNameMap.get(adv.partner_id) || '').toLowerCase() : '';
      const partnerEmailMatch = adv.partners?.users?.email?.toLowerCase().includes(q) || false;
      const matchesSearch = !q || companyMatch || emailMatch || partnerEmailMatch || partnerLabel.includes(q);

      if (!matchesSearch) return false;

      if (filterType === 'linked') return !!adv.partner_id;
      if (filterType === 'direct') return !adv.partner_id;
      return true;
    });
  }, [advertisers, searchQuery, filterType, partnerNameMap]);

  const stats = useMemo(() => {
    const total = advertisers.length;
    const linked = advertisers.filter(a => !!a.partner_id).length;
    const direct = total - linked;
    const linkRate = total > 0 ? Math.round((linked / total) * 100) : 0;
    return { total, linked, direct, linkRate };
  }, [advertisers]);

  const handleOpenModal = (adv?: Advertiser) => {
    setErrorMsg('');
    if (adv) {
      setEditingAdvertiser(adv);
      setNewCompany(adv.company_name || '');
      setEditPartnerId(adv.partner_id || '');
    } else {
      setEditingAdvertiser(null);
      setNewCompany('');
      setNewEmail('');
      setNewPassword('');
      setEditPartnerId('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (editingAdvertiser) {
        const { error } = await supabase
          .from('advertisers')
          .update({
            company_name: newCompany,
            partner_id: editPartnerId || null
          })
          .eq('id', editingAdvertiser.id);

        if (error) throw new Error('Erro ao atualizar anunciante: ' + error.message);
      } else {
        const { data: adminData } = await supabase
          .from('users')
          .select('org_id')
          .eq('id', user?.id)
          .single();

        const orgId = adminData?.org_id;
        if (!orgId) throw new Error('Não foi possível identificar a organização do admin.');

        const { createClient } = await import('@supabase/supabase-js');
        const tempClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false } }
        );

        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email: newEmail,
          password: newPassword,
          options: {
            data: {
              role: 'advertiser',
              org_id: orgId,
              name: newCompany
            }
          }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            throw new Error('Este e-mail já está cadastrado no sistema.');
          }
          throw new Error(authError.message);
        }

        const newUserId = authData.user?.id;
        if (!newUserId) throw new Error('Falha ao obter ID do novo usuário.');

        await new Promise(resolve => setTimeout(resolve, 1000));

        const { error: advError } = await supabase
          .from('advertisers')
          .insert([
            {
              user_id: newUserId,
              company_name: newCompany,
              org_id: orgId,
              ...(editPartnerId ? { partner_id: editPartnerId } : {})
            }
          ]);

        if (advError) {
          console.error('Insert Advertiser error:', advError);
          throw new Error('Falha ao criar o perfil de anunciante.');
        }
      }

      setIsModalOpen(false);
      loadData();
      if (!editingAdvertiser) {
        alert('Anunciante cadastrado com sucesso!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao salvar o anunciante.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdvertiser = async (id: string) => {
    if (
      !confirm(
        'Tem certeza que deseja excluir este anunciante? Esta ação não pode ser desfeita e removerá todas as campanhas associadas a ele.'
      )
    )
      return;

    const { error } = await supabase.from('advertisers').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      loadData();
    }
  };

  return (
    <div className="page-shell fade-up">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Anunciantes</h1>
          <p className="page-subtitle">
            Gerencie contas comerciais, credenciais de acesso, vínculos de indicação e criativos atribuídos.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenModal()}
          >
            <Plus size={15} />
            <span>Novo Anunciante</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total de Anunciantes</span>
            <span className="kpi-icon"><Briefcase size={15} /></span>
          </div>
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-meta">Contas comerciais ativas</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Indicados por Parceiros</span>
            <span className="kpi-icon"><UserCheck size={15} /></span>
          </div>
          <div className="kpi-value">{stats.linked}</div>
          <div className="kpi-meta">Com repasse recorrente ativo</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Vendas Diretas</span>
            <span className="kpi-icon"><TrendingUp size={15} /></span>
          </div>
          <div className="kpi-value">{stats.direct}</div>
          <div className="kpi-meta">Receita integral da rede</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Taxa de Parcerias</span>
            <span className="kpi-icon"><Percent size={15} /></span>
          </div>
          <div className="kpi-value">{stats.linkRate}%</div>
          <div className="kpi-meta">Participação do canal parceiro</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="segmented-control">
            <button
              type="button"
              className={`seg-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              <span>Todos</span>
              <span className="seg-count">{advertisers.length}</span>
            </button>
            <button
              type="button"
              className={`seg-btn ${filterType === 'linked' ? 'active' : ''}`}
              onClick={() => setFilterType('linked')}
            >
              <span>Indicados</span>
              <span className="seg-count">{stats.linked}</span>
            </button>
            <button
              type="button"
              className={`seg-btn ${filterType === 'direct' ? 'active' : ''}`}
              onClick={() => setFilterType('direct')}
            >
              <span>Venda Direta</span>
              <span className="seg-count">{stats.direct}</span>
            </button>
          </div>
        </div>

        <div className="toolbar-right">
          <div className="search-field">
            <Search size={14} className="search-field-icon" />
            <input
              type="text"
              placeholder="Buscar por empresa, e-mail ou parceiro..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-field-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar busca"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="loader" />
            <span>Carregando anunciantes...</span>
          </div>
        ) : filteredAdvertisers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Briefcase size={18} />
            </div>
            <div className="empty-state-title">Nenhum anunciante encontrado</div>
            <div className="empty-state-desc">
              {searchQuery || filterType !== 'all'
                ? 'Nenhum anunciante corresponde aos filtros aplicados.'
                : 'Cadastre a primeira empresa anunciante para gerenciar campanhas e faturas.'}
            </div>
            {(searchQuery || filterType !== 'all') && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '8px' }}
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Empresa / Anunciante</th>
                  <th>Origem / Indicador</th>
                  <th>Status</th>
                  <th>Criativos</th>
                  <th>Cadastro</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdvertisers.map(advertiser => {
                  const initial = (advertiser.company_name || 'A').charAt(0).toUpperCase();
                  const count = allMediaCounts[advertiser.id] || 0;
                  const partnerLabel = advertiser.partner_id
                    ? partnerNameMap.get(advertiser.partner_id) ||
                      advertiser.partners?.users?.email ||
                      'Parceiro vinculado'
                    : null;

                  return (
                    <tr key={advertiser.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                          <div className="entity-avatar">{initial}</div>
                          <div>
                            <div className="cell-primary">
                              {advertiser.company_name || 'Empresa não informada'}
                            </div>
                            <div className="cell-secondary">
                              {advertiser.users?.email || 'Sem e-mail vinculado'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        {partnerLabel ? (
                          <span className="badge badge-info">
                            <UserCheck size={11} />
                            {partnerLabel}
                          </span>
                        ) : (
                          <span className="badge badge-neutral">Venda Direta</span>
                        )}
                      </td>

                      <td>
                        <span className="badge badge-success">
                          <span className="status-dot online" />
                          Ativo
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${count > 0 ? 'btn-secondary' : 'btn-ghost'}`}
                          onClick={() => handleOpenMediaModal(advertiser)}
                        >
                          <Film size={12} />
                          <span>Mídias ({count})</span>
                        </button>
                      </td>

                      <td className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(advertiser.created_at).toLocaleDateString('pt-BR')}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => handleOpenModal(advertiser)}
                            title="Editar anunciante"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => handleDeleteAdvertiser(advertiser.id)}
                            title="Excluir anunciante"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Criar / Editar Anunciante */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {editingAdvertiser ? 'Editar Anunciante' : 'Novo Anunciante'}
                </h2>
                <p className="modal-subtitle">
                  {editingAdvertiser
                    ? 'Atualize os dados corporativos e o vínculo de comissionamento.'
                    : 'Configure a conta comercial, credenciais de acesso e atribuição de parceria.'}
                </p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                {errorMsg && (
                  <div className="alert-error">
                    <AlertCircle size={15} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {editingAdvertiser && (
                  <div className="notice-bar" style={{ marginBottom: 0 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Login vinculado:</span>
                    <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {editingAdvertiser.users?.email || 'E-mail não disponível'}
                    </strong>
                  </div>
                )}

                <div className="form-section">
                  <div className="form-section-header">
                    <span className="form-section-title">Identificação da Empresa</span>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Nome da Empresa / Nome Fantasia</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ex: Clínica Vida Saudável"
                      value={newCompany}
                      onChange={e => setNewCompany(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {!editingAdvertiser && (
                  <div className="form-section">
                    <div className="form-section-header">
                      <span className="form-section-title">Credenciais de Acesso</span>
                    </div>
                    <div className="form-grid-2">
                      <div className="input-group">
                        <label className="input-label">E-mail Corporativo</label>
                        <input
                          type="email"
                          className="input-field"
                          placeholder="contato@empresa.com.br"
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Senha Inicial</label>
                        <input
                          type="password"
                          className="input-field"
                          placeholder="Mínimo 6 caracteres"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                    <span className="input-hint">
                      O anunciante utilizará estas credenciais para acompanhar relatórios e faturas.
                    </span>
                  </div>
                )}

                <div className="form-section">
                  <div className="form-section-header">
                    <span className="form-section-title">Comissionamento & Parceria</span>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Parceiro Indicador</label>
                    <select
                      className="select-field"
                      value={editPartnerId}
                      onChange={e => setEditPartnerId(e.target.value)}
                    >
                      <option value="">Venda Direta (Sem comissão de parceiro)</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.establishment_name
                            ? `${p.establishment_name} (${p.users?.email || p.id.slice(0, 6)})`
                            : p.users?.email || p.id}
                        </option>
                      ))}
                    </select>
                    <span className="input-hint">
                      Quando vinculado, o parceiro visualiza a indicação em seu painel comercial.
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className="loader" />
                  ) : editingAdvertiser ? (
                    'Salvar Alterações'
                  ) : (
                    'Cadastrar Anunciante'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Gestão de Mídias do Anunciante */}
      {selectedAdvForMedia && (
        <div className="modal-overlay" onClick={() => setSelectedAdvForMedia(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  Criativos — {selectedAdvForMedia.company_name}
                </h2>
                <p className="modal-subtitle">
                  ID #{selectedAdvForMedia.id.slice(0, 8)} · {advMediaList.length} arquivo(s) vinculado(s)
                </p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedAdvForMedia(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {mediaModalLoading ? (
                <div className="loading-state" style={{ padding: '32px 0' }}>
                  <div className="loader" />
                  <span>Carregando mídias vinculadas...</span>
                </div>
              ) : advMediaList.length === 0 ? (
                <div className="card empty-state" style={{ padding: '36px 20px' }}>
                  <div className="empty-state-icon">
                    <Film size={18} />
                  </div>
                  <div className="empty-state-title">Nenhuma mídia atribuída</div>
                  <div className="empty-state-desc">
                    Selecione um arquivo da biblioteca geral abaixo para vincular a este anunciante.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {advMediaList.map(m => {
                    const isVideo = m.file_type?.startsWith('video/') || m.name?.endsWith('.mp4');
                    const isApproved = m.status === 'approved';
                    const isRejected = m.status === 'rejected';
                    const isPending = !isApproved && !isRejected;

                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--bg-surface-sub)',
                          border: '1px solid var(--border-subtle)',
                          padding: '10px 14px',
                          borderRadius: 'var(--r-md)',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '200px' }}>
                          <div className="entity-avatar">
                            {isVideo ? <Film size={14} /> : <ImageIcon size={14} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              className="cell-primary"
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {m.name || m.original_name || 'Sem nome'}
                            </div>
                            <div className="cell-secondary">
                              {isVideo ? 'Vídeo MP4' : 'Imagem'} · {m.duration || 15}s
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isApproved && (
                            <span className="badge badge-success">
                              <span className="status-dot online" />
                              Aprovada
                            </span>
                          )}
                          {isPending && (
                            <span className="badge badge-warning">
                              <span className="status-dot warning" />
                              Pendente
                            </span>
                          )}
                          {isRejected && (
                            <span className="badge badge-danger">
                              <span className="status-dot offline" />
                              Rejeitada
                            </span>
                          )}

                          {!isApproved && (
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={() => handleUpdateMediaStatus(m.id, 'approved')}
                              title="Aprovar criativo"
                            >
                              <Check size={12} />
                              <span>Aprovar</span>
                            </button>
                          )}

                          {!isRejected && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleUpdateMediaStatus(m.id, 'rejected')}
                              title="Rejeitar criativo"
                            >
                              <X size={12} />
                              <span>Rejeitar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => handleUnlinkMedia(m.id)}
                            title="Desvincular deste anunciante"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Vincular Criativo da Biblioteca */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-title">
                    <Link size={14} />
                    <span>Vincular Criativo da Biblioteca Geral</span>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <select
                    className="select-field"
                    value={selectedLibraryId}
                    onChange={e => setSelectedLibraryId(e.target.value)}
                    style={{ flex: 1, minWidth: '220px' }}
                  >
                    <option value="">Selecione um arquivo do acervo...</option>
                    {libraryMedias.map(libM => (
                      <option key={libM.id} value={libM.id}>
                        {libM.name || libM.original_name || 'Sem nome'}
                        {libM.advertiser_id === selectedAdvForMedia.id ? ' (Já vinculado)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedLibraryId}
                    onClick={() => handleLinkMediaToAdv(selectedLibraryId)}
                    className="btn btn-primary"
                  >
                    <Link size={14} />
                    <span>Vincular e Aprovar</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedAdvForMedia(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
