import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("w-full border-collapse text-sm", className)}
      {...props}
    >
      {children}
    </table>
  );
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  isHeader?: boolean;
}

export function TableRow({
  children,
  isHeader = false,
  className,
  ...props
}: TableRowProps) {
  return (
    <tr
      className={cn(
        isHeader
          ? "bg-slate-50"
          : "border-t border-slate-100 hover:bg-indigo-50/40 transition-colors duration-100",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeader({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-5 py-3.5 text-sm text-slate-700", className)} {...props}>
      {children}
    </td>
  );
}
