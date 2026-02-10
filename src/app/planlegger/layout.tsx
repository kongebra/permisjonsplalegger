import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planlegger | Permisjonsøkonomi-kalkulator",
};

export default function PlanleggerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
