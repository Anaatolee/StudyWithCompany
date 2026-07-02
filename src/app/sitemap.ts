import type { MetadataRoute } from "next";

// ============================================================
// SITEMAP — plan du site pour les moteurs de recherche (Google…)
//
// Next.js sert automatiquement ce fichier à l'adresse :
//   https://studywithcompany.com/sitemap.xml
//
// On n'y liste QUE les pages publiques. Les pages protégées par
// authentification (salles, profil, paramètres…) ne doivent pas
// être indexées → elles sont volontairement absentes ici et
// bloquées dans robots.ts.
//
// Pour ajouter une nouvelle page publique plus tard : ajouter une
// ligne dans le tableau ci-dessous. Google la découvrira au prochain
// passage automatique.
// ============================================================

const BASE_URL = "https://studywithcompany.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // Page d'accueil — la plus importante (priority 1)
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },

    // Pages de connexion / inscription
    { url: `${BASE_URL}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/signup`, changeFrequency: "monthly", priority: 0.5 },

    // Pages légales — changent rarement (priority basse)
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
