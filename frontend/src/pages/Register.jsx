import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', role: 'TENANT', gender: 'ANY',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await register(form);
      navigate(user.role === 'OWNER' ? '/owner' : '/tenant');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="panel auth-card">
        <h2>Create your Nestora account</h2>
        <form className="form" onSubmit={onSubmit}>
          <label>Full name<input value={form.name} onChange={set('name')} required /></label>
          <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
          <label>Password<input type="password" value={form.password} onChange={set('password')} minLength={6} required /></label>
          <label>Phone<input value={form.phone} onChange={set('phone')} /></label>
          <div className="form-row">
            <label>I am a
              <select value={form.role} onChange={set('role')}>
                <option value="TENANT">Tenant / Student</option>
                <option value="OWNER">Hostel Owner</option>
              </select>
            </label>
            <label>Gender preference
              <select value={form.gender} onChange={set('gender')}>
                <option value="ANY">Prefer not to say</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </label>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: '1rem' }}>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
