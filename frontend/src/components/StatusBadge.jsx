export default function StatusBadge({ status }) {
  const s = (status || '').toUpperCase();
  let cls = 'badge-info';
  if (['PAID', 'SUCCESS', 'APPROVED', 'ACTIVE', 'VERIFIED'].includes(s)) cls = 'badge-ok';
  if (['PENDING', 'CREATED'].includes(s)) cls = 'badge-warn';
  if (['REJECTED', 'FAILED', 'OVERDUE', 'CANCELLED'].includes(s)) cls = 'badge-bad';
  return <span className={`badge ${cls}`}>{s}</span>;
}
