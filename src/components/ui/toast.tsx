'use client';

import * as React from 'react';
import { createContext, use, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = use(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const toast: Toast = { id, message, type, duration };

      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

const TOAST_STYLES: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
  info: {
    bg: 'bg-info-bg border-info-fg/20 text-info-fg',
    icon: <Info className="w-4 h-4" />,
  },
  success: {
    bg: 'bg-success-bg border-success-fg/20 text-success-fg',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  warning: {
    bg: 'bg-warning-bg border-warning-fg/20 text-warning-fg',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  error: {
    bg: 'bg-destructive/10 border-destructive/20 text-destructive',
    icon: <AlertCircle className="w-4 h-4" />,
  },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const style = TOAST_STYLES[toast.type];

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border shadow-lg animate-in slide-in-from-bottom-2',
        style.bg
      )}
      role="alert"
    >
      {style.icon}
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="p-1 hover:bg-black/10 rounded transition-colors"
        aria-label="Lukk"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
