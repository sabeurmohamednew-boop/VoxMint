"use client";

import * as Toast from "@radix-ui/react-toast";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastItem = { id: string; title: string; tone: "success" | "error" };
type ToastContextValue = { showToast: (title: string, tone?: ToastItem["tone"]) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const showToast = useCallback((title: string, tone: ToastItem["tone"] = "success") => {
    const id = crypto.randomUUID();
    setItems((current) => [...current, { id, title, tone }]);
  }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      <Toast.Provider swipeDirection="right" duration={3600}>
        {children}
        {items.map((item) => (
          <Toast.Root
            className="toast-root"
            key={item.id}
            onOpenChange={(open) => {
              if (!open) setItems((current) => current.filter((entry) => entry.id !== item.id));
            }}
          >
            {item.tone === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
            ) : (
              <CircleAlert className="h-5 w-5 text-[var(--danger)]" />
            )}
            <Toast.Title className="text-sm font-semibold">{item.title}</Toast.Title>
            <Toast.Close className="button-ghost grid h-8 min-h-0 w-8 place-items-center p-0" aria-label="Dismiss notification">
              <X className="h-4 w-4" />
            </Toast.Close>
          </Toast.Root>
        ))}
        <Toast.Viewport className="toast-viewport" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
