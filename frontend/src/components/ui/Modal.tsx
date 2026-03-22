import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={cn(
        'relative bg-surface-800 border border-surface-700 shadow-2xl w-full max-h-[90vh] flex flex-col',
        'rounded-t-xl sm:rounded-xl sm:max-w-lg sm:mx-4',
        className
      )}>
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-surface-700 shrink-0">
          <h3 className="text-lg font-semibold text-surface-100 truncate pr-4">{title}</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-200 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 sm:px-7 py-5 sm:py-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
