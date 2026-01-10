import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      icon: <CheckCircle className="w-5 h-5" />,
      className: 'bg-green-900 border-green-700 text-green-100'
    },
    error: {
      icon: <AlertCircle className="w-5 h-5" />,
      className: 'bg-red-900 border-red-700 text-red-100'
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      className: 'bg-yellow-900 border-yellow-700 text-yellow-100'
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      className: 'bg-blue-900 border-blue-700 text-blue-100'
    }
  };

  const { icon, className } = config[type];

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border-2 ${className} shadow-2xl animate-slide-in max-w-md`}>
      {icon}
      <p className="font-medium text-sm flex-1">{message}</p>
      <button onClick={onClose} className="ml-2 hover:opacity-70 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};