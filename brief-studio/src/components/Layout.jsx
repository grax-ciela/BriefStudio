import { NavLink, Link } from 'react-router-dom'
import { LayoutGrid, FolderOpen, Upload, Settings, Plus } from 'lucide-react'

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-title">BRIEF STUDIO</span>
          <span className="sidebar-brand-sub">By Grax</span>
        </div>

        <div className="sidebar-section-label">Principal</div>

        <NavLink
          to="/"
          end
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <LayoutGrid size={18} />
          <span>Briefs</span>
        </NavLink>

        <NavLink
          to="/batches"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <FolderOpen size={18} />
          <span>Batches</span>
        </NavLink>

        <NavLink
          to="/import"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <Upload size={18} />
          <span>Importar CSV</span>
        </NavLink>

        <div className="sidebar-spacer" />

        <div className="sidebar-item" style={{ opacity: 0.4, cursor: 'default' }}>
          <Settings size={18} />
          <span>Configuración</span>
        </div>
      </nav>

      <div className="main-content">
        <header className="top-header">
          <span className="top-header-brand">Brief Studio</span>
          <div className="top-header-spacer" />
          <Link to="/briefs/new">
            <button className="btn btn-primary btn-sm">
              <Plus size={15} /> Nuevo Brief
            </button>
          </Link>
        </header>

        {children}
      </div>
    </div>
  )
}
