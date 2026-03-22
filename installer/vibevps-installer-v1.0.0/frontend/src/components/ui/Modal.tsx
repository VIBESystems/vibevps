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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={cn('relative bg-surface-800 border border-surface-700 rounded-xl shadow-2xl w-full max-w-lg mx-4', className)}>
        <div className="flex items-center justify-between px-7 py-5 border-b border-surface-700">
          <h3 className="text-lg font-semibold text-surface-100">{title}</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-7 py-6">{children}</div>
      </div>
    </div>
  );
}
