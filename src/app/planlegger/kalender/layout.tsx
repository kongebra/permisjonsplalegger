import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kalender | Permisjonsøkonomi-kalkulator",
};

export default function KalenderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
