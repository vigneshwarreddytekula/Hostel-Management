import { useEffect, useState } from 'react';
import api from '../api';
import StatusBadge from '../components/StatusBadge';

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');

  const reload = async () => {
    const [d, u, h] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/users', { params: roleFilter ? { role: roleFilter } : {} }),
      api.get('/admin/hostels'),
    ]);
    setStats(d.data);
    setUsers(u.data);
    setHostels(h.data);
  };

  useEffect(() => { reload(); }, [roleFilter]);

  const verify = async (id, verified) => {
    await api.patch(`/hostels/${id}/verify`, null, { params: { verified } });
    reload();
  };

  const deleteHostel = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}" from the platform?`)) return;
    try {
      await api.delete(`/hostels/${id}`);
      reload();
    } catch (ex) {
      alert(ex.response?.data?.error || 'Could not delete hostel.');
    }
  };

  const setActive = async (id, active) => {
    await api.patch(`/admin/users/${id}/active`, null, { params: { active } });
    reload();
  };

  return (
    <div className="container section">
      <div className="section-head">
        <h1>Admin console</h1>
      </div>
      <div className="actions" style={{ marginBottom: '1rem' }}>
        {['overview', 'users', 'hostels'].map((id) => (
          <button
            key={id}
            type="button"
            className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(id)}
          >
            {id}
          </button>
        ))}
      </div>

      {tab === 'overview' && stats && (
        <div className="grid grid-4">
          <div className="panel stat"><div className="value">{stats.totalUsers}</div><div className="label">Users</div></div>
          <div className="panel stat"><div className="value">{stats.tenants}/{stats.owners}</div><div className="label">Tenants / Owners</div></div>
          <div className="panel stat"><div className="value">{stats.verifiedHostels}/{stats.hostels}</div><div className="label">Verified / Hostels</div></div>
          <div className="panel stat"><div className="value">₹{stats.totalRevenue}</div><div className="label">Collected revenue</div></div>
          <div className="panel stat"><div className="value">{stats.activeBookings}</div><div className="label">Active bookings</div></div>
        </div>
      )}

      {tab === 'users' && (
        <div className="panel table-wrap">
          <label style={{ display: 'inline-flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            Filter role
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All</option>
              <option value="TENANT">Tenant</option>
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><StatusBadge status={u.role} /></td>
                  <td>{u.active ? 'Yes' : 'No'}</td>
                  <td>
                    {u.role !== 'ADMIN' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        onClick={() => setActive(u.id, !u.active)}
                      >
                        {u.active ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'hostels' && (
        <div className="panel table-wrap">
          <table>
            <thead><tr><th>Hostel</th><th>City</th><th>Owner</th><th>Verified</th><th /></tr></thead>
            <tbody>
              {hostels.map((h) => (
                <tr key={h.id}>
                  <td>{h.name}</td>
                  <td>{h.city}</td>
                  <td>{h.ownerName}</td>
                  <td><StatusBadge status={h.verified ? 'VERIFIED' : 'PENDING'} /></td>
                  <td className="actions">
                    {!h.verified && (
                      <button className="btn btn-primary btn-sm" type="button" onClick={() => verify(h.id, true)}>Verify</button>
                    )}
                    {h.verified && (
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => verify(h.id, false)}>Unverify</button>
                    )}
                    <button className="btn btn-danger btn-sm" type="button" onClick={() => deleteHostel(h.id, h.name)}>🗑️ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
