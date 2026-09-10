import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Protected({ roles, children }) {
  const { user, loading, isAuth } = useAuth();
  if (loading) return <div className="container section">Loading…</div>;
  if (!isAuth) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
