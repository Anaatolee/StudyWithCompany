import Link from "next/link";
import { BookOpen } from "lucide-react";

export const metadata = { title: "Politique de confidentialité — StudyWithCompany" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav minimale */}
      <header className="border-b border-border">
        <div className="max-w-[860px] mx-auto px-6 py-4 flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition">
            <span className="w-[30px] h-[30px] rounded-[8px] bg-accent grid place-items-center">
              <BookOpen className="w-4 h-4 text-white" />
            </span>
            <span className="font-display font-semibold">StudyWithCompany</span>
          </Link>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-[860px] mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Politique de confidentialité</h1>
        <p className="text-muted text-sm mb-10">Dernière mise à jour : juin 2026</p>

        <Section title="1. Qui sommes-nous ?">
          <p>StudyWithCompany est une application web accessible à l'adresse <strong>studywithcompany.com</strong>, permettant à des étudiants de travailler ensemble en ligne dans des salles d'étude virtuelles.</p>
        </Section>

        <Section title="2. Données collectées">
          <p>Lors de l'utilisation de StudyWithCompany, nous collectons les données suivantes :</p>
          <ul>
            <li><strong>Données de compte</strong> : adresse e-mail, pseudo, photo de profil (facultative), biographie (facultative)</li>
            <li><strong>Données d'utilisation</strong> : messages envoyés dans le chat général et les messages privés, historique de connexion aux salles d'étude</li>
            <li><strong>Données techniques</strong> : adresse IP, type de navigateur, données de session</li>
          </ul>
        </Section>

        <Section title="3. Pourquoi collectons-nous ces données ?">
          <p>Ces données sont utilisées exclusivement pour :</p>
          <ul>
            <li>Créer et gérer votre compte</li>
            <li>Faire fonctionner les salles d'étude, le chat et les fonctionnalités sociales (amis, messages privés)</li>
            <li>Améliorer l'expérience utilisateur</li>
            <li>Assurer la sécurité de la plateforme</li>
          </ul>
        </Section>

        <Section title="4. Stockage et hébergement">
          <p>Vos données sont stockées de manière sécurisée via <strong>Supabase</strong> (base de données PostgreSQL chiffrée). Les flux vidéo et audio en temps réel transitent par <strong>LiveKit</strong> et ne sont pas enregistrés.</p>
        </Section>

        <Section title="5. Partage des données">
          <p>Nous ne vendons, ne louons et ne partageons pas vos données personnelles avec des tiers à des fins commerciales. Vos données peuvent être transmises uniquement :</p>
          <ul>
            <li>Aux prestataires techniques nécessaires au fonctionnement de l'app (Supabase, LiveKit)</li>
            <li>Si la loi l'exige (réquisition judiciaire)</li>
          </ul>
        </Section>

        <Section title="6. Vos droits">
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul>
            <li><strong>Accès</strong> : consulter les données que nous détenons sur vous</li>
            <li><strong>Rectification</strong> : corriger vos informations depuis la page Profil</li>
            <li><strong>Suppression</strong> : supprimer votre compte et toutes vos données en nous contactant</li>
            <li><strong>Portabilité</strong> : obtenir une copie de vos données</li>
          </ul>
          <p>Pour exercer ces droits, contactez-nous à : <a href="mailto:support@studywithcompany.com" className="text-accent hover:underline">support@studywithcompany.com</a></p>
        </Section>

        <Section title="7. Cookies">
          <p>StudyWithCompany utilise uniquement des cookies strictement nécessaires au maintien de votre session de connexion. Aucun cookie publicitaire ou de tracking tiers n'est utilisé.</p>
        </Section>

        <Section title="8. Mineurs">
          <p>L'accès à StudyWithCompany est réservé aux personnes âgées d'au moins <strong>13 ans</strong>. Si vous avez connaissance qu'un mineur de moins de 13 ans a créé un compte, contactez-nous pour suppression immédiate.</p>
        </Section>

        <Section title="9. Modifications">
          <p>Nous nous réservons le droit de modifier cette politique. En cas de changement significatif, vous serez informé par e-mail ou via une notification sur la plateforme.</p>
        </Section>
      </main>

      <footer className="border-t border-border mt-8">
        <div className="max-w-[860px] mx-auto px-6 py-6 flex items-center justify-between gap-4 text-sm text-muted">
          <Link href="/" className="hover:text-foreground transition">← Retour à l'accueil</Link>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground transition">Confidentialité</Link>
            <Link href="/terms" className="hover:text-foreground transition">Conditions d'utilisation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-3 text-foreground">{title}</h2>
      <div className="text-foreground/80 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
