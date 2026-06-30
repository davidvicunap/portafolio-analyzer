import type { Metadata } from "next";
import { CsvImport } from "@/components/portfolio/CsvImport";

export const metadata: Metadata = {
  title: "Import · Portfolio Analyzer",
};

export default function ImportPage() {
  return <CsvImport />;
}
