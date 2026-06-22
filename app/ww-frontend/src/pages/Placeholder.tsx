import { Hexagon } from 'lucide-react';

interface PlaceholderProps {
  title: string;
}

export function Placeholder({ title }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full opacity-50" style={{ color: 'var(--text-muted)' }}>
      <Hexagon size={48} className="mb-4" />
      <p>{title} - Section under construction...</p>
    </div>
  );
}
