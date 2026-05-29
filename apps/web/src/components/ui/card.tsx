import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`border-b border-slate-100 px-6 py-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`px-6 py-5 ${className}`}>
      {children}
    </div>
  );
}
