"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Holding } from "@/lib/types";
import { portfolioStore, makeHolding } from "@/lib/storage/portfolio";

interface PortfolioContextValue {
  holdings: Holding[];
  hydrated: boolean;
  addHolding: (input: Omit<Holding, "id">) => void;
  updateHolding: (id: string, patch: Partial<Omit<Holding, "id">>) => void;
  removeHolding: (id: string) => void;
  replaceAll: (holdings: Holding[]) => void;
  clear: () => void;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted holdings after mount. localStorage isn't available during
  // SSR, so hydrating here (rather than in a useState initializer) is the
  // intended pattern and avoids a server/client markup mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoldings(portfolioStore.list());
    setHydrated(true);
  }, []);

  // Persist whenever holdings change (post-hydration only).
  useEffect(() => {
    if (hydrated) portfolioStore.save(holdings);
  }, [holdings, hydrated]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = () => setHoldings(portfolioStore.list());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addHolding = useCallback((input: Omit<Holding, "id">) => {
    setHoldings((prev) => [...prev, makeHolding(input)]);
  }, []);

  const updateHolding = useCallback(
    (id: string, patch: Partial<Omit<Holding, "id">>) => {
      setHoldings((prev) =>
        prev.map((h) =>
          h.id === id
            ? {
                ...h,
                ...patch,
                ticker: patch.ticker
                  ? patch.ticker.trim().toUpperCase()
                  : h.ticker,
              }
            : h,
        ),
      );
    },
    [],
  );

  const removeHolding = useCallback((id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const replaceAll = useCallback((next: Holding[]) => {
    setHoldings(next);
  }, []);

  const clear = useCallback(() => setHoldings([]), []);

  const value = useMemo(
    () => ({
      holdings,
      hydrated,
      addHolding,
      updateHolding,
      removeHolding,
      replaceAll,
      clear,
    }),
    [holdings, hydrated, addHolding, updateHolding, removeHolding, replaceAll, clear],
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }
  return ctx;
}
