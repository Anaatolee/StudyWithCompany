import type { MetadataRoute } from "next";

// ============================================================
// ROBOTS.TXT — instructions pour les robots des moteurs de recherche
//
// Next.js sert automatiquement ce fichier à l'adresse :
//   https://studywithcompany.com/robots.txt
//
// Rôle :
//   - Autoriser l'exploration des pages publiques (allow "/")
//   - Interdire l'indexation des pages protégées / privées
//   - Indiquer l'emplacement du sitemap
// ============================================================

const BASE_URL = "https://studywithcompany.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*", // s'applique à tous les robots
      allow: "/", // tout est explorable par défaut…
      disallow: [
        // …sauf les espaces authentifiés / privés :
        "/rooms/", // salles d'étude (contenu dynamique, réservé aux connectés)
        "/profile", // profil personnel
        "/settings", // paramètres du compte
        "/friends", // liste d'amis
        "/stats", // statistiques personnelles
        "/api/", // routes techniques (API)
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`, // pointe vers le plan du site
  };
}
