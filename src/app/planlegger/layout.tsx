import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planlegg permisjonen din",
  description:
    "Sett opp foreldrepermisjonen steg for steg. Velg termindato, fordeling mellom mor og far, dekningsgrad og barnehagestart. Gratis og privat.",
  alternates: {
    canonical: "https://perm-planlegger.vercel.app/planlegger",
  },
};

export default function PlanleggerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
