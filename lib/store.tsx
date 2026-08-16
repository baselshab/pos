"use client";

import { createContext, useContext, useState, useEffect } from "react";

export type AppState = {
  sidebarOpen: boolean;
  suspendedCount: number;
  storage?: { usage: number; quota: number; persisted: boolean };
  online: boolean;
  cacheVersion?: string;
  swStatus: string;
  updateAvailable: boolean;
};

const initialState: AppState = {
  sidebarOpen: false,
  suspendedCount: 0,
  online: true,
  swStatus: "unknown",
  updateAvailable: false,
};

const StoreContext = createContext<{
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
} | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  return (
    <StoreContext.Provider value={{ state, setState }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useAppState must be used within AppStateProvider");
  return context;
}
