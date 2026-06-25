import Link from "next/link";
import { BookOpen } from "lucide-react";

export const metadata = { title: "Conditions d'utilisation — StudyWithCompany" };

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold mb-2">Conditions générales d'utilisation</h1>
        <p className="text-muted text-sm mb-10">Dernière mise à jour : juin 2026</p>

        <Section title="1. Acceptation des conditions">
          <p>En créant un compte sur <strong>studywithcompany.com</strong>, vous acceptez sans réserve les présentes conditions générales d'utilisation (CGU). Si vous n'acceptez pas ces conditions, vous ne pouvez pas utiliser la plateforme.</p>
        </Section>

        <Section title="2. Description du service">
          <p>StudyWithCompany est une plateforme collaborative permettant à des étudiants de se retrouver dans des salles d'étude virtuelles, de communiquer via chat, audio et vidéo, et de s'entraider dans leur travail.</p>
        </Section>

        <Section title="3. Création de compte">
          <ul>
            <li>Vous devez fournir une adresse e-mail valide et un pseudo unique</li>
            <li>Vous êtes responsable de la confidentialité de vos identifiants</li>
            <li>Un seul compte par personne est autorisé</li>
            <li>Vous devez avoir au moins <strong>13 ans</strong> pour créer un compte</li>
          </ul>
        </Section>

        <Section title="4. Comportement attendu">
          <p>Vous vous engagez à utiliser StudyWithCompany de manière respectueuse. Sont strictement interdits :</p>
          <ul>
            <li>Le harcèlement, les insultes ou tout comportement offensant envers d'autres utilisateurs</li>
            <li>La diffusion de contenus illégaux, violents, pornographiques ou haineux</li>
            <li>Le spam, la publicité non sollicitée ou le démarchage commercial</li>
            <li>L'usurpation d'identité d'un autre utilisateur</li>
            <li>Toute tentative de pirater, perturber ou surcharger la plateforme</li>
          </ul>
          <p>Tout manquement à ces règles peut entraîner la suspension ou la suppression définitive de votre compte, sans préavis.</p>
        </Section>

        <Section title="5. Contenu utilisateur">
          <p>Vous conservez la propriété de vos contenus (messages, photo de profil, bio). En les publiant sur StudyWithCompany, vous nous accordez une licence limitée pour les afficher dans le cadre du service. Vous garantissez que vos contenus ne violent aucun droit de tiers.</p>
        </Section>

        <Section title="6. Disponibilité du service">
          <p>StudyWithCompany est fourni "tel quel". Nous faisons notre possible pour assurer une disponibilité maximale, mais nous ne garantissons pas un service ininterrompu. Des interruptions de maintenance ou des incidents techniques peuvent survenir.</p>
        </Section>

        <Section title="7. Limitation de responsabilité">
          <p>StudyWithCompany ne saurait être tenu responsable :</p>
          <ul>
            <li>Des contenus publiés par les utilisateurs</li>
            <li>Des dommages indirects liés à l'utilisation ou à l'impossibilité d'utiliser le service</li>
            <li>Des interactions entre utilisateurs en dehors de la plateforme</li>
          </ul>
        </Section>

        <Section title="8. Modification et résiliation">
          <p>Nous nous réservons le droit de modifier ces CGU à tout moment. Nous nous réservons également le droit de suspendre ou fermer la plateforme. En cas de changement majeur, les utilisateurs seront notifiés.</p>
          <p>Vous pouvez supprimer votre compte à tout moment en nous contactant à <a href="mailto:support@studywithcompany.com" className="text-accent hover:underline">support@studywithcompany.com</a>.</p>
        </Section>

        <Section title="9. Droit applicable">
          <p>Les présentes CGU sont régies par le droit français. En cas de litige, les tribunaux français seront seuls compétents.</p>
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
