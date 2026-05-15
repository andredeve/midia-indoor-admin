import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LayoutDashboard, MonitorPlay, ListVideo, Image as ImageIcon, LogOut, Menu, X } from 'lucide-react';

export default function Layout() {
  const { signOut, user } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="app-container">
      {/* Overlay */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={closeSidebar}></div>
      
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ padding: '1.5rem', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
          <img 
            src="/logo.png" 
            alt="GYM PLAY Mídia" 
            style={{ 
              width: '100%', 
              maxWidth: '140px', 
              height: 'auto',
              objectFit: 'contain'
            }} 
          />
          <button className="sidebar-close" onClick={closeSidebar}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} end onClick={closeSidebar}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink to="/terminals" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
            <MonitorPlay size={20} />
            <span>Terminais (TVs)</span>
          </NavLink>
          
          <NavLink to="/media" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
            <ImageIcon size={20} />
            <span>Biblioteca de Mídias</span>
          </NavLink>
          
          <NavLink to="/playlists" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
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
          <button className="menu-toggle" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }} className="user-info">
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.user_metadata?.name || 'Administrador'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000', fontSize: '0.875rem' }}>
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
