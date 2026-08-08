import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">

      <aside className="sidebar">

        {/* BRAND */}
        <div className="sidebar-brand">
          <div className="brand-mark">◆</div>

          <div>
            <div className="brand-name">
              ERP · CRM
            </div>

            <div className="brand-subtitle">
              Business Portal
            </div>
          </div>
        </div>

        {/* MAIN NAVIGATION */}
        <div className="sidebar-section">

          <div className="sidebar-label">
            MAIN
          </div>

          <nav className="sidebar-nav">

            <NavLink
              to="/overview"
              className={({ isActive }) =>
                isActive ? 'nav-item active' : 'nav-item'
              }
            >
              <span className="nav-icon">⌂</span>
              <span>Overview</span>
            </NavLink>

            <NavLink
              to="/customers"
              className={({ isActive }) =>
                isActive ? 'nav-item active' : 'nav-item'
              }
            >
              <span className="nav-icon">▦</span>
              <span>Customers</span>
            </NavLink>

            <NavLink
              to="/products"
              className={({ isActive }) =>
                isActive ? 'nav-item active' : 'nav-item'
              }
            >
              <span className="nav-icon">◇</span>
              <span>Products</span>
            </NavLink>

            <NavLink
              to="/challans"
              className={({ isActive }) =>
                isActive ? 'nav-item active' : 'nav-item'
              }
            >
              <span className="nav-icon">→</span>
              <span>Sales Challans</span>
            </NavLink>

          </nav>

        </div>

        {/* USER */}
        <div className="sidebar-user">

          <div className="user-info">

            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>

            <div className="user-details">
              <strong>
                {user?.name || 'Admin User'}
              </strong>

              <span>
                {user?.role || 'ADMIN'}
              </span>
            </div>

          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            <span>⇥</span>
            Logout
          </button>

        </div>

      </aside>

      <main className="content">
        <Outlet />
      </main>

    </div>
  );
}