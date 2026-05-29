import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost";
}

const VARIANT_STYLES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-gray-900 text-white hover:bg-gray-700 focus-visible:ring-gray-900",
  ghost:
    "bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400",
};

export default function Button({
  variant = "default",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${VARIANT_STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
