import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyTogether — Étudiez ensemble en visio",
  description:
    "Rejoignez des salles d'étude par matière, en vidéo, avec un chat en temps réel.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
