import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Layout() {
  const { user, logout, isAuth } = useAuth();
  const navigate = useNavigate();

  const dashPath =
    user?.role === 'ADMIN' ? '/admin' :
    user?.role === 'OWNER' ? '/owner' :
    '/tenant';

  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <Link to="/" className="brand">Nestora <span>hostels</span></Link>
          <nav className="nav-links">
            <NavLink to="/search">Find hostels</NavLink>
            {isAuth && <NavLink to={dashPath}>Dashboard</NavLink>}
            {isAuth && <NavLink to="/notifications">Alerts</NavLink>}
            {!isAuth && <NavLink to="/login">Log in</NavLink>}
            {!isAuth && (
              <Link className="btn btn-primary btn-sm" to="/register">Get started</Link>
            )}
            {isAuth && (
              <>
                <span className="muted">{user.name}</span>
                <button
                  className="linkish"
                  type="button"
                  onClick={() => { logout(); navigate('/'); }}
                >
                  Log out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="footer">
        <div className="container">Nestora — Hostel booking & rental management</div>
      </footer>
    </>
  );
}
