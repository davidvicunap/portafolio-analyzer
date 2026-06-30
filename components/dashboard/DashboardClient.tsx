"use client";

import { useEffect, useMemo, useState } from "react";
import type { Holding, Quote, Profile } from "@/lib/types";
import { usePortfolio } from "@/components/portfolio/PortfolioProvider";
import { useFetch } from "@/lib/client/useFetch";
import {
  buildPositions,
  computeTotals,
  allocationByHolding,
  allocationBySector,
  allocationByType,
  performers,
  type Performer,
} from "@/lib/portfolio-metrics";
import {
  formatCurrency,
  formatPercentValue,
  formatSignedCurrency,
  changeColor,
} from "@/lib/format";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Modal } from "@/components/ui/Modal";
import { Spinner, Skeleton, ErrorState, EmptyState } from "@/components/ui/States";
import { AllocationPie } from "@/components/charts/AllocationPie";
import { HoldingsTable } from "@/components/tables/HoldingsTable";
import { HoldingForm, type HoldingDraft } from "@/components/portfolio/HoldingForm";
import { cn } from "@/lib/cn";

type AllocationMode = "holding" | "sector" | "type";
type FormState = { kind: "closed" } | { kind: "new" } | { kind: "edit"; holding: Holding };

export function DashboardClient() {
  const {
    holdings,
    hydrated,
    addHolding,
    updateHolding,
    removeHolding,
  } = usePortfolio();

  const symbols = useMemo(
    () => [...new Set(holdings.map((h) => h.ticker.toUpperCase()))],
    [holdings],
  );
  const symbolKey = symbols.join(",");

  const quotesState = useFetch<{ quotes: Quote[] }>(
    symbols.length ? `/api/quote?symbols=${symbolKey}` : null,
  );
  const profilesState = useFetch<{ profiles: Profile[] }>(
    symbols.length ? `/api/profiles?symbols=${symbolKey}` : null,
  );

  const [allocMode, setAllocMode] = useState<AllocationMode>("holding");
  const [form, setForm] = useState<FormState>({ kind: "closed" });

  function refreshAll() {
    quotesState.refetch();
    profilesState.refetch();
  }

  // Auto-refresh quotes when the tab regains focus.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") quotesState.refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [quotesState]);

  const quotes = useMemo(
    () => quotesState.data?.quotes ?? [],
    [quotesState.data],
  );
  const profiles = useMemo(
    () => profilesState.data?.profiles ?? [],
    [profilesState.data],
  );

  const positions = useMemo(
    () => buildPositions(holdings, quotes),
    [holdings, quotes],
  );
  const totals = useMemo(() => computeTotals(positions), [positions]);

  const allocation = useMemo(() => {
    if (allocMode === "sector") return allocationBySector(positions, profiles);
    if (allocMode === "type") return allocationByType(positions, profiles);
    return allocationByHolding(positions);
  }, [allocMode, positions, profiles]);

  const dayPerf = useMemo(() => performers(positions, "day"), [positions]);
  const allTimePerf = useMemo(() => performers(positions, "allTime"), [positions]);

  function handleSubmit(draft: HoldingDraft) {
    if (form.kind === "edit") updateHolding(form.holding.id, draft);
    else addHolding(draft);
    setForm({ kind: "closed" });
  }

  function handleRemove(id: string) {
    const h = holdings.find((x) => x.id === id);
    if (h && window.confirm(`Remove ${h.ticker} from your portfolio?`)) {
      removeHolding(id);
    }
  }

  // --- Render states ---
  if (!hydrated) {
    return <DashboardSkeleton />;
  }

  if (holdings.length === 0) {
    return (
      <>
        <PageHeader onAdd={() => setForm({ kind: "new" })} onRefresh={refreshAll} refreshing={false} />
        <EmptyState
          title="Your portfolio is empty"
          message="Add a holding to start tracking live value, returns, allocation, and SEC filings."
          action={
            <Button onClick={() => setForm({ kind: "new" })}>Add your first holding</Button>
          }
          className="mt-6"
        />
        <FormModal form={form} onClose={() => setForm({ kind: "closed" })} onSubmit={handleSubmit} />
      </>
    );
  }

  const loadingQuotes = quotesState.loading && !quotesState.data;

  return (
    <>
      <PageHeader
        onAdd={() => setForm({ kind: "new" })}
        onRefresh={refreshAll}
        refreshing={quotesState.loading}
      />

      {quotesState.error && !quotesState.data ? (
        <ErrorState
          title="Couldn't load quotes"
          message={quotesState.error}
          onRetry={refreshAll}
          className="mt-6"
        />
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {/* Summary */}
          <Card>
            <CardBody className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {loadingQuotes ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-28" />
                  </div>
                ))
              ) : (
                <>
                  <Stat
                    label="Total value"
                    value={formatCurrency(totals.totalValue)}
                    sub={`${totals.pricedCount}/${totals.totalCount} priced`}
                  />
                  <Stat
                    label="Day change"
                    value={
                      <span className={changeColor(totals.dayChange)}>
                        {formatSignedCurrency(totals.dayChange)}
                      </span>
                    }
                    sub={
                      <span className={changeColor(totals.dayChange)}>
                        {formatPercentValue(totals.dayChangePct, { signed: true })}
                      </span>
                    }
                  />
                  <Stat
                    label="Total return"
                    value={
                      <span className={changeColor(totals.totalReturn)}>
                        {formatSignedCurrency(totals.totalReturn)}
                      </span>
                    }
                    sub={
                      <span className={changeColor(totals.totalReturn)}>
                        {formatPercentValue(totals.totalReturnPct, { signed: true })}
                      </span>
                    }
                  />
                  <Stat label="Cost basis" value={formatCurrency(totals.totalCost)} />
                </>
              )}
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Allocation */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Allocation</CardTitle>
                <Segmented
                  ariaLabel="Allocation breakdown"
                  options={[
                    { value: "holding", label: "Holding" },
                    { value: "sector", label: "Sector" },
                    { value: "type", label: "Type" },
                  ]}
                  value={allocMode}
                  onChange={setAllocMode}
                />
              </CardHeader>
              <CardBody>
                {loadingQuotes ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <AllocationPie data={allocation} />
                )}
              </CardBody>
            </Card>

            {/* Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Movers</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-4">
                <PerformerGroup label="Today" best={dayPerf.best} worst={dayPerf.worst} />
                <div className="border-t border-border" />
                <PerformerGroup label="All-time" best={allTimePerf.best} worst={allTimePerf.worst} />
              </CardBody>
            </Card>
          </div>

          {/* Holdings table */}
          <Card>
            <CardHeader>
              <CardTitle>Holdings</CardTitle>
              <span className="text-xs text-muted">
                {positions.length} {positions.length === 1 ? "position" : "positions"}
              </span>
            </CardHeader>
            <CardBody className="p-0 sm:p-0">
              <HoldingsTable
                positions={positions}
                onEdit={(id) => {
                  const h = holdings.find((x) => x.id === id);
                  if (h) setForm({ kind: "edit", holding: h });
                }}
                onRemove={handleRemove}
              />
            </CardBody>
          </Card>
        </div>
      )}

      <FormModal form={form} onClose={() => setForm({ kind: "closed" })} onSubmit={handleSubmit} />
    </>
  );
}

function PageHeader({
  onAdd,
  onRefresh,
  refreshing,
}: {
  onAdd: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted">Live portfolio overview</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? <Spinner /> : <RefreshIcon />}
          Refresh
        </Button>
        <Button size="sm" onClick={onAdd}>
          + Add holding
        </Button>
      </div>
    </div>
  );
}

function PerformerGroup({
  label,
  best,
  worst,
}: {
  label: string;
  best: Performer | null;
  worst: Performer | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <PerformerRow caption="Best" performer={best} />
      <PerformerRow caption="Worst" performer={worst} />
    </div>
  );
}

function PerformerRow({
  caption,
  performer,
}: {
  caption: string;
  performer: Performer | null;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{caption}</span>
      {performer ? (
        <span className="flex items-center gap-2">
          <span className="font-medium">{performer.ticker}</span>
          <span className={cn("tabular", changeColor(performer.pct))}>
            {formatPercentValue(performer.pct, { signed: true })}
          </span>
        </span>
      ) : (
        <span className="text-muted">—</span>
      )}
    </div>
  );
}

function FormModal({
  form,
  onClose,
  onSubmit,
}: {
  form: FormState;
  onClose: () => void;
  onSubmit: (draft: HoldingDraft) => void;
}) {
  return (
    <Modal
      open={form.kind !== "closed"}
      onClose={onClose}
      title={form.kind === "edit" ? "Edit holding" : "Add holding"}
    >
      <HoldingForm
        initial={form.kind === "edit" ? form.holding : undefined}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
