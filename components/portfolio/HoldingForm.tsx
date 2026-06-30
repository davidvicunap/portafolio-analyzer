"use client";

import { useState } from "react";
import type { Holding } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";

export interface HoldingDraft {
  ticker: string;
  shares: number;
  costBasis: number;
  purchaseDate?: string;
  notes?: string;
}

interface HoldingFormProps {
  initial?: Holding;
  onSubmit: (draft: HoldingDraft) => void;
  onCancel: () => void;
}

interface FormErrors {
  ticker?: string;
  shares?: string;
  costBasis?: string;
}

export function HoldingForm({ initial, onSubmit, onCancel }: HoldingFormProps) {
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [shares, setShares] = useState(initial ? String(initial.shares) : "");
  const [costBasis, setCostBasis] = useState(
    initial ? String(initial.costBasis) : "",
  );
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!/^[A-Za-z.\-]{1,10}$/.test(ticker.trim())) {
      next.ticker = "Enter a valid ticker (e.g. AAPL).";
    }
    const sharesNum = Number(shares);
    if (!Number.isFinite(sharesNum) || sharesNum <= 0) {
      next.shares = "Shares must be a positive number.";
    }
    const costNum = Number(costBasis);
    if (!Number.isFinite(costNum) || costNum < 0) {
      next.costBasis = "Cost basis must be zero or more.";
    }
    return next;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit({
      ticker: ticker.trim().toUpperCase(),
      shares: Number(shares),
      costBasis: Number(costBasis),
      purchaseDate: purchaseDate || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Ticker" htmlFor="ticker" error={errors.ticker}>
          <input
            id="ticker"
            className={inputClass}
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="AAPL"
            autoCapitalize="characters"
            autoComplete="off"
            aria-invalid={!!errors.ticker}
          />
        </Field>
        <Field
          label="Purchase date"
          htmlFor="purchaseDate"
          hint="Optional — used for return timing."
        >
          <input
            id="purchaseDate"
            type="date"
            className={inputClass}
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </Field>
        <Field label="Shares" htmlFor="shares" error={errors.shares}>
          <input
            id="shares"
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            className={inputClass}
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="10"
            aria-invalid={!!errors.shares}
          />
        </Field>
        <Field
          label="Cost basis / share"
          htmlFor="costBasis"
          error={errors.costBasis}
        >
          <input
            id="costBasis"
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            className={inputClass}
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value)}
            placeholder="150.25"
            aria-invalid={!!errors.costBasis}
          />
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes" hint="Optional.">
        <input
          id="notes"
          className={inputClass}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Long-term hold"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Add holding"}</Button>
      </div>
    </form>
  );
}
