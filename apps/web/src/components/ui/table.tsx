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
          ? "bg-gray-50"
          : "border-t border-gray-100 hover:bg-gray-50 transition-colors"
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
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 ${className}`}
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
    <td {...props} className={`px-4 py-3 text-gray-700 ${className}`}>
      {children}
    </td>
  );
}
