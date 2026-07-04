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
    <div className="app">
      {/* Overlay */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={closeSidebar}></div>
      
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
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
          <button className="btn btn-icon" onClick={closeSidebar} aria-label="Close sidebar">
            <X size={24} />
          </button>
        </div>
        
        <nav className="nav flex-col">
          <NavLink to="/" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'} end onClick={closeSidebar}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink to="/terminals" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
            <MonitorPlay size={20} />
            <span>Terminais (TVs)</span>
          </NavLink>
          
          <NavLink to="/media" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
            <ImageIcon size={20} />
            <span>Biblioteca de Mídias</span>
          </NavLink>
          
          <NavLink to="/playlists" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
            <ListVideo size={20} />
            <span>Playlists</span>
          </NavLink>
        </nav>
        
        <div className="sidebar-footer">
          <button onClick={signOut} className="btn btn-outline btn-full">
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <button className="btn btn-icon menu-toggle" onClick={toggleSidebar} aria-label="Toggle menu">
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="user-info text-right">
              <div className="text-sm font-medium">{user?.user_metadata?.name || 'Administrador'}</div>
              <div className="text-xs text-muted">{user?.email}</div>
            </div>
            <div className="avatar bg-primary text-dark">
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
