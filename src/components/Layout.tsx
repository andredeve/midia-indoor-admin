import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LayoutDashboard, MonitorPlay, ListVideo, Image as ImageIcon, LogOut } from 'lucide-react';

export default function Layout() {
  const { signOut, user } = useAuthStore();

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '2rem 1.5rem', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MonitorPlay size={28} color="var(--primary-color)" />
            <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#ffffff' }}>
              GYM <span style={{ color: 'var(--primary-color)' }}>PLAY</span>
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', letterSpacing: '3px', color: 'var(--text-muted)', textTransform: 'uppercase', alignSelf: 'flex-start', marginLeft: '2.5rem' }}>
            — Mídia —
          </span>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} end>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink to="/terminals" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <MonitorPlay size={20} />
            <span>Terminais (TVs)</span>
          </NavLink>
          
          <NavLink to="/media" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <ImageIcon size={20} />
            <span>Biblioteca de Mídias</span>
          </NavLink>
          
          <NavLink to="/playlists" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <ListVideo size={20} />
            <span>Playlists</span>
          </NavLink>
        </nav>
        
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--panel-border)' }}>
          <button onClick={signOut} className="btn btn-outline" style={{ width: '100%', justifyContent: 'flex-start' }}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.user_metadata?.name || 'Administrador'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {user?.user_metadata?.name?.charAt(0) || 'A'}
            </div>
          </div>
        </header>
        
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
