import React, { useEffect } from 'react';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationProps {
  message: string;
  type?: NotificationType;
  onClose?: () => void;
  duration?: number; // ms
}

const typeStyles: Record<NotificationType, string> = {
  info: 'bg-primary/10 border-primary text-primary',
  success: 'bg-accent/10 border-accent text-accent-foreground',
  warning: 'bg-secondary/10 border-secondary text-secondary-foreground',
  error: 'bg-destructive/10 border-destructive text-destructive',
};

export const Notification: React.FC<NotificationProps> = ({
  message,
  type = 'info',
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    if (!onClose) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      className={`fixed z-50 top-6 right-6 min-w-[220px] max-w-xs border-l-8 border-l-[transparent] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-2 before:bg-[url('/greek-meander.svg')] before:bg-repeat-y before:rounded-l-md before:content-[''] px-4 py-3 rounded shadow-lg flex items-start gap-2 animate-fade-in-up ${typeStyles[type]}`}
      role="alert"
    >
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          className="ml-2 text-lg font-bold text-gray-400 hover:text-gray-700 focus:outline-none"
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Notification; 