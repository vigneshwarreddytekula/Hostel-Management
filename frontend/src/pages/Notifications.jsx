import { useEffect, useState } from 'react';
import api from '../api';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    const [list, count] = await Promise.all([
      api.get('/notifications'),
      api.get('/notifications/unread-count'),
    ]);
    setItems(list.data);
    setUnread(count.data.count);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    load();
  };

  const markAll = async () => {
    await api.post('/notifications/read-all');
    load();
  };

  return (
    <div className="container section">
      <div className="section-head actions" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Notifications</h1>
          <p>{unread} unread</p>
        </div>
        <button className="btn btn-secondary btn-sm" type="button" onClick={markAll}>Mark all read</button>
      </div>
      <div className="grid">
        {items.map((n) => (
          <div
            key={n.id}
            className="panel"
            style={{ opacity: n.read ? 0.7 : 1, cursor: n.read ? 'default' : 'pointer' }}
            onClick={() => !n.read && markRead(n.id)}
          >
            <div className="actions" style={{ justifyContent: 'space-between' }}>
              <strong>{n.title}</strong>
              <span className="chip">{n.type}</span>
            </div>
            <p className="meta">{n.body}</p>
            <p className="meta">{new Date(n.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {items.length === 0 && <div className="panel empty">No notifications yet.</div>}
      </div>
    </div>
  );
}
