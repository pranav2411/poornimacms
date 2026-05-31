export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

let listeners: Set<(toast: Toast[]) => void> = new Set();
let toasts: Toast[] = [];

export const useToast = () => {
  const addToast = (
    toast: Omit<Toast, "id">
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    toasts = [...toasts, newToast];
    
    listeners.forEach((listener) => listener(toasts));

    // Auto-remove after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3000);

    return id;
  };

  const removeToast = (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((listener) => listener(toasts));
  };

  return { addToast, removeToast };
};

export const subscribe = (listener: (toast: Toast[]) => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
