import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Payroll Portal",
    template: "%s · Payroll Portal",
  },
  description:
    "Pay slips, salary insights, documents, and time off for small businesses.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
