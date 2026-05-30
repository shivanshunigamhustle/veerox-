import { Table, TableHeader, TableRow, TableCell } from "@/components/ui";
import { formatDateTime, formatPhone } from "@/lib/format";
import type { Lead } from "@/lib/types";
import { IntentBadge } from "./intent-badge";

export interface LeadTableProps {
  leads: Lead[];
}

/**
 * Presentational lead table (UI plan §7.2) — aware of the Lead type but not of
 * fetching. Columns: Name, Phone, Intent, Created.
 */
export function LeadTable({ leads }: LeadTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <thead>
          <TableRow isHeader>
            <TableHeader>Name</TableHeader>
            <TableHeader>Phone</TableHeader>
            <TableHeader>Intent</TableHeader>
            <TableHeader>Created</TableHeader>
          </TableRow>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>
                <span className="font-semibold text-slate-800">
                  {lead.name ?? "—"}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-slate-600">
                  {formatPhone(lead.phone)}
                </span>
              </TableCell>
              <TableCell>
                <IntentBadge intent={lead.intent} />
              </TableCell>
              <TableCell className="text-xs text-slate-500">
                {formatDateTime(lead.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
