import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planlegg foreldrepermisjon steg for steg",
  description:
    "Sett opp foreldrepermisjonen din steg for steg. Velg termindato, fordeling mellom mor og far, dekningsgrad, og se når barnehageplassen starter. Gratis og privat.",
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
