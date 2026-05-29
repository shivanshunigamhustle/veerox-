import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      {...props}
      className={`w-full border-collapse text-sm ${className}`}
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
  className = "",
  ...props
}: TableRowProps) {
  return (
    <tr
      {...props}
      className={`${
        isHeader
          ? "bg-slate-50"
          : "border-t border-slate-100 hover:bg-indigo-50/40 transition-colors duration-100"
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableHeader({
  children,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      className={`px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 ${className}`}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td {...props} className={`px-5 py-3.5 text-sm text-slate-700 ${className}`}>
      {children}
    </td>
  );
}
