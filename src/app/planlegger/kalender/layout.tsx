import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Permisjonskalender",
  description:
    "Interaktiv kalender for foreldrepermisjon. Planlegg perioder, se sammenligning av 80% og 100% dekning, og beregn gapet før barnehagestart.",
  alternates: {
    canonical: "https://perm-planlegger.vercel.app/planlegger/kalender",
  },
};

export default function KalenderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <h1 className="sr-only">Permisjonskalender og økonomioversikt</h1>
      {children}
    </>
  );
}
