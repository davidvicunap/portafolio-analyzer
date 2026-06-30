"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePortfolio } from "@/components/portfolio/PortfolioProvider";
import { parseHoldingsCsv, CSV_TEMPLATE, type PreviewRow } from "@/lib/csv";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export function CsvImport() {
  const { addHolding, replaceAll, holdings } = usePortfolio();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [replace, setReplace] = useState(false);
  const [imported, setImported] = useState<number | null>(null);

  const validRows = rows?.filter((r) => r.draft) ?? [];
  const invalidRows = rows?.filter((r) => !r.draft) ?? [];

  function handleParse(source: string) {
    setImported(null);
    setText(source);
    setRows(source.trim() ? parseHoldingsCsv(source) : null);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => handleParse(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function handleImport() {
    if (validRows.length === 0) return;
    if (replace) {
      // Build fresh holdings and replace in one shot.
      const fresh = validRows.map((r) => r.draft!);
      // Use addHolding semantics via replaceAll with generated ids.
      replaceAll([]);
      fresh.forEach((d) => addHolding(d));
    } else {
      validRows.forEach((r) => addHolding(r.draft!));
    }
    setImported(validRows.length);
    setRows(null);
    setText("");
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Import holdings</h1>
          <p className="text-sm text-muted">
            Upload or paste a CSV with columns: ticker, shares, cost_basis,
            purchase_date.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={downloadTemplate}>
          Download template
        </Button>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              Choose CSV file
            </Button>
            <span className="text-sm text-muted">or paste below</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => handleParse(e.target.value)}
            rows={6}
            placeholder={CSV_TEMPLATE}
            className={cn(inputClass, "h-auto resize-y py-2 font-mono text-xs")}
            aria-label="CSV content"
          />
        </CardBody>
      </Card>

      {imported != null && (
        <div className="flex items-center justify-between rounded-lg border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive">
          <span>Imported {imported} holding{imported === 1 ? "" : "s"}.</span>
          <Button size="sm" onClick={() => router.push("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      )}

      {rows && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <div className="flex items-center gap-2 text-xs">
              <Badge tone="positive">{validRows.length} valid</Badge>
              {invalidRows.length > 0 && (
                <Badge tone="negative">{invalidRows.length} skipped</Badge>
              )}
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <th className="px-3 py-2 text-left font-medium">Ticker</th>
                    <th className="px-3 py-2 text-right font-medium">Shares</th>
                    <th className="px-3 py-2 text-right font-medium">Cost basis</th>
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.line}
                      className={cn(
                        "border-b border-border/60",
                        !r.draft && "bg-negative/5",
                      )}
                    >
                      <td className="px-3 py-2 font-medium">{r.ticker || "—"}</td>
                      <td className="tabular px-3 py-2 text-right">{r.shares || "—"}</td>
                      <td className="tabular px-3 py-2 text-right">{r.costBasis || "—"}</td>
                      <td className="tabular px-3 py-2 text-muted">{r.purchaseDate || "—"}</td>
                      <td className="px-3 py-2">
                        {r.draft ? (
                          <span className="text-positive">Ready</span>
                        ) : (
                          <span className="text-negative">{r.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {rows && validRows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Replace existing portfolio ({holdings.length} current)
          </label>
          <Button onClick={handleImport}>
            Import {validRows.length} holding{validRows.length === 1 ? "" : "s"}
          </Button>
        </div>
      )}
    </div>
  );
}
