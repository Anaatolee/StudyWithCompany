import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Landing } from "@/components/landing/Landing";
import { DaylightWrapper } from "@/components/DaylightWrapper";

const SITE_URL = "https://studywithcompany.com";
const PAGE_TITLE = "StudyWithCompany - Étudiez ensemble en visio";
const PAGE_DESCRIPTION =
  "Rejoignez des salles d'étude virtuelles par matière, allumez votre caméra, et travaillez aux côtés d'autres étudiants.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  applicationName: "StudyWithCompany",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: SITE_URL,
    siteName: "StudyWithCompany",
    locale: "fr_FR",
    type: "website",
  },
};

// WebSite structured data — the primary signal Google uses to display the site
// name ("StudyWithCompany") instead of the domain in search results.
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "StudyWithCompany",
  url: SITE_URL,
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/rooms");

  return (
    <DaylightWrapper className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <Landing />
    </DaylightWrapper>
  );
}
