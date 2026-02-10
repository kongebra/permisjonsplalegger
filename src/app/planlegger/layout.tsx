import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planlegger",
  description:
    "Sett opp foreldrepermisjonen steg for steg. Velg termin, fordeling og dekningsgrad.",
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
