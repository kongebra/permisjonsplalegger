import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kalender",
  description:
    "Interaktiv kalender for permisjonsplanlegging. Se perioder, økonomi og gapet før barnehagestart.",
  alternates: {
    canonical: "https://perm-planlegger.vercel.app/planlegger/kalender",
  },
};

export default function KalenderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
