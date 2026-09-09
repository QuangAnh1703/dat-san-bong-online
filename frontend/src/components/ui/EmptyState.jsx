export default function EmptyState({ title, children }) {
  return (
    <div className="state" style={{ gridColumn: '1 / -1' }}>
      <b>{title}</b>
      {children}
    </div>
  );
}
