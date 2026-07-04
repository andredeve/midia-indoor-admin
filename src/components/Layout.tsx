import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LayoutDashboard, MonitorPlay, ListVideo, Image as ImageIcon, LogOut, Menu, X } from 'lucide-react';

export default function Layout() {
  const { signOut, user } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const displayName = user?.user_metadata?.name || 'Administrador';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="app-container">
      {/* Overlay for mobile */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/logo.png" alt="GYM PLAY Mídia" />
          </div>
          <button className="sidebar-close" onClick={closeSidebar} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Menu</span>

          <NavLink to="/" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} end onClick={closeSidebar}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/terminals" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
            <MonitorPlay size={18} />
            <span>Terminais (TVs)</span>
          </NavLink>

          <NavLink to="/media" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
            <ImageIcon size={18} />
            <span>Biblioteca de Mídias</span>
          </NavLink>

          <NavLink to="/playlists" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
            <ListVideo size={18} />
            <span>Playlists</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={signOut} className="nav-item" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={toggleSidebar} aria-label="Abrir menu">
              <Menu size={20} />
            </button>
          </div>

          <div className="topbar-right">
            <div className="user-chip">
              <div className="user-avatar">{initial}</div>
              <span className="user-name">{displayName}</span>
            </div>
          </div>
        </header>

        <div className="page-content fade-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
