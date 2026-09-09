export default function SkeletonGrid({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => <div className="skeleton" key={i} />);
}
