import { createContext, useContext, useMemo, useState, PropsWithChildren } from 'react';

type UIState = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
};

const Ctx = createContext<UIState | null>(null);

export function UIProvider({ children }: PropsWithChildren) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const value = useMemo<UIState>(() => ({
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed((v) => !v),
  }), [sidebarCollapsed]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}

