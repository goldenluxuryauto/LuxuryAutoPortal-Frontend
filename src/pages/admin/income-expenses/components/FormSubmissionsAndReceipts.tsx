/**
 * Approved Form Submissions & Receipts
 * Displays approved expense form submissions with receipt photos, separated from manual I&E entries
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildApiUrl } from "@/lib/queryClient";
import { ChevronDown, ChevronRight, FileText, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CATEGORY_LABELS: Record<string, string> = {
  income: "Income",
  directDelivery: "Direct Delivery",
  cogs: "COGS",
  reimbursedBills: "Reimbursed Bills",
};

function formatFieldLabel(field: string) {
  return field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

interface FormSubmissionsAndReceiptsProps {
  carId: number;
  year: string;
  className?: string;
}

export default function FormSubmissionsAndReceipts({ carId, year, className }: FormSubmissionsAndReceiptsProps) {
  const [expanded, setExpanded] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/expense-form-submissions/approved-by-car", carId, year],
    queryFn: async () => {
      const res = await fetch(
        buildApiUrl(`/api/expense-form-submissions/approved-by-car?carId=${carId}&year=${year}`),
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!carId && !!year,
  });

  const submissions = data?.data ?? [];

  return (
    <div className={cn("border border-border rounded-lg bg-card/50 mb-4", className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <Receipt className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">
            Form Submissions & Receipts ({submissions.length})
          </span>
          <span className="text-xs text-muted-foreground">
            — Values from approved receipt forms (separate from manual entries)
          </span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
          ) : submissions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No approved form submissions for this car/year.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {submissions.map((sub: any) => (
                <div
                  key={sub.id}
                  className="border border-border rounded-md p-3 bg-background/80"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {formatFieldLabel(sub.field)} — ${Number(sub.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sub.employeeName} • {MONTHS[Number(sub.month) - 1]} • {CATEGORY_LABELS[sub.category] || sub.category}
                      </p>
                    </div>
                  </div>
                  {sub.receiptUrls && sub.receiptUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {sub.receiptUrls.map((fileId: string, i: number) => {
                        const isPdf = fileId.toLowerCase().endsWith(".pdf");
                        const url = buildApiUrl(
                          `/api/expense-form-submissions/receipt/file?fileId=${encodeURIComponent(fileId)}`
                        );
                        return (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <FileText className="w-3 h-3" />
                            {isPdf ? `Receipt ${i + 1} (PDF)` : `Receipt ${i + 1}`}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
