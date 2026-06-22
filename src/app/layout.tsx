import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://studywithcompany.com"),
  title: "StudyWithCompany — Étudiez ensemble en visio",
  description:
    "Rejoignez des salles d'étude par matière, en vidéo, avec un chat en temps réel.",
  applicationName: "StudyWithCompany",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint to avoid a flash of the wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var r=document.documentElement;if(localStorage.getItem('swc-theme')==='dark')r.classList.add('dark');if(localStorage.getItem('swc-reduce-motion')==='true')r.classList.add('reduce-motion')}catch(e){}",
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
