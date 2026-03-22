import { cn } from '../../lib/utils';

const statusStyles: Record<string, string> = {
  running: 'bg-green-500/15 text-green-400 border-green-500/30',
  stopped: 'bg-red-500/15 text-red-400 border-red-500/30',
  paused: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  suspended: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  unknown: 'bg-surface-500/15 text-surface-400 border-surface-500/30',
};

const statusDot: Record<string, string> = {
  running: 'bg-green-400',
  stopped: 'bg-red-400',
  paused: 'bg-amber-400',
  suspended: 'bg-purple-400',
  unknown: 'bg-surface-400',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border',
        statusStyles[status] || statusStyles.unknown
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', statusDot[status] || statusDot.unknown)} />
      {status}
    </span>
  );
}
