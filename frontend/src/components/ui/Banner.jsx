export default function Banner({ tone = 'warn', children }) {
  return (
    <div className={`banner ${tone}`}>
      <span aria-hidden="true">⚠</span>
      <span>{children}</span>
    </div>
  );
}
