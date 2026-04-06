import { Shield, FileText, Scale, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Footer from './Footer'
import { usePageMeta } from '../hooks/usePageMeta'

function LegalLayout({ icon, title, children, seo }) {
  usePageMeta(seo)
  const navigate = useNavigate()
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[780px] mx-auto px-6 py-14">
        <button onClick={() => navigate('/taches')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6 bg-transparent border-none cursor-pointer transition-colors">
          <ArrowLeft size={16} /> Retour à l'application
        </button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
            {icon}
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <div className="prose-legal flex flex-col gap-6 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
      <Footer />
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-base font-bold text-foreground mb-2">{title}</h2>
      {children}
    </section>
  )
}

export function MentionsLegales() {
  return (
    <LegalLayout
      icon={<Scale size={20} />}
      title="Mentions légales"
      seo={{ title: 'Mentions légales', description: 'Mentions légales de Make Your List.', path: '/mentions-legales' }}
    >
      <Section title="Éditeur du site">
        <p>
          Make Your List est un service en ligne édité par un développeur indépendant basé en France.
        </p>
        <p>
          Contact : disponible via l'application (section Membres / Support).
        </p>
      </Section>

      <Section title="Hébergement">
        <p>
          L'application est hébergée par :<br />
          <strong className="text-foreground">Vercel Inc.</strong> — 340 S Lemon Ave #4133, Walnut, CA 91789, USA<br />
          Site : vercel.com
        </p>
        <p>
          Les données sont stockées par :<br />
          <strong className="text-foreground">Supabase Inc.</strong> — Infrastructure PostgreSQL managée, région Europe (eu-west).<br />
          Site : supabase.com
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          L'ensemble du contenu du site (textes, interface, code, design) est protégé par le droit d'auteur.
          Toute reproduction, même partielle, est interdite sans autorisation préalable.
        </p>
      </Section>

      <Section title="Responsabilité">
        <p>
          L'éditeur s'efforce de fournir un service fiable et disponible. Toutefois, aucune garantie
          de disponibilité permanente n'est offerte. L'éditeur ne saurait être tenu responsable des
          dommages directs ou indirects liés à l'utilisation du service.
        </p>
      </Section>
    </LegalLayout>
  )
}

export function Confidentialite() {
  return (
    <LegalLayout
      icon={<Shield size={20} />}
      title="Politique de confidentialité"
      seo={{ title: 'Confidentialité', description: 'Politique de confidentialité de Make Your List.', path: '/confidentialite' }}
    >
      <Section title="Données collectées">
        <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
        <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
          <li><strong className="text-foreground">Compte</strong> : adresse email, nom d'affichage (optionnel)</li>
          <li><strong className="text-foreground">Contenu</strong> : tâches, notes, listes, boards kanban que vous créez</li>
          <li><strong className="text-foreground">Technique</strong> : logs de connexion (adresse IP, date/heure) pour la sécurité</li>
        </ul>
      </Section>

      <Section title="Utilisation des données">
        <p>Vos données sont utilisées exclusivement pour :</p>
        <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
          <li>Fournir et maintenir le service</li>
          <li>Authentifier votre compte</li>
          <li>Synchroniser vos données entre vos appareils</li>
        </ul>
        <p className="mt-2">
          <strong className="text-foreground">Nous ne vendons jamais vos données.</strong> Aucun tracking publicitaire,
          aucun partage avec des tiers à des fins marketing.
        </p>
      </Section>

      <Section title="Stockage et sécurité">
        <p>
          Vos données sont stockées sur des serveurs Supabase (PostgreSQL managé) hébergés en Europe (région eu-west).
          Les connexions sont chiffrées via TLS. L'accès aux données est protégé par Row Level Security (RLS) :
          seuls vous et les membres que vous invitez peuvent accéder à vos projets.
        </p>
      </Section>

      <Section title="Conservation">
        <p>
          Vos données sont conservées tant que votre compte est actif. En cas de suppression de compte,
          toutes vos données personnelles et votre contenu sont supprimés définitivement sous 30 jours.
        </p>
      </Section>

      <Section title="Vos droits">
        <p>
          Conformément au RGPD, vous disposez des droits suivants :
        </p>
        <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
          <li><strong className="text-foreground">Accès</strong> : consulter les données que nous détenons sur vous</li>
          <li><strong className="text-foreground">Rectification</strong> : modifier vos informations personnelles</li>
          <li><strong className="text-foreground">Suppression</strong> : demander la suppression de votre compte et données</li>
          <li><strong className="text-foreground">Portabilité</strong> : exporter vos données (fonctionnalité disponible dans l'app)</li>
        </ul>
        <p className="mt-2">
          Pour exercer ces droits, contactez-nous via l'application.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Make Your List utilise uniquement des cookies techniques nécessaires au fonctionnement du service
          (authentification, préférences de thème). Aucun cookie de tracking ou publicitaire n'est utilisé.
        </p>
      </Section>
    </LegalLayout>
  )
}

export function CGU() {
  return (
    <LegalLayout
      icon={<FileText size={20} />}
      title="Conditions générales d'utilisation"
      seo={{ title: 'CGU', description: "Conditions générales d'utilisation de Make Your List.", path: '/cgu' }}
    >
      <Section title="Objet">
        <p>
          Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation
          du service Make Your List. En utilisant le service, vous acceptez ces conditions dans leur intégralité.
        </p>
      </Section>

      <Section title="Description du service">
        <p>
          Make Your List est une application web de productivité permettant de gérer des tâches, notes,
          tableaux kanban et de collaborer en équipe. Le service est proposé en version gratuite
          avec des fonctionnalités limitées, et en versions payantes (Étudiant, Pro) avec des
          fonctionnalités étendues.
        </p>
      </Section>

      <Section title="Inscription">
        <p>
          L'accès au service nécessite la création d'un compte avec une adresse email valide.
          Vous êtes responsable de la confidentialité de vos identifiants de connexion.
          Toute activité réalisée depuis votre compte est réputée effectuée par vous.
        </p>
      </Section>

      <Section title="Utilisation acceptable">
        <p>Vous vous engagez à ne pas :</p>
        <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
          <li>Utiliser le service à des fins illégales ou non autorisées</li>
          <li>Tenter d'accéder aux données d'autres utilisateurs</li>
          <li>Perturber ou surcharger le service (attaques, scraping abusif)</li>
          <li>Revendre ou redistribuer le service sans autorisation</li>
        </ul>
      </Section>

      <Section title="Propriété du contenu">
        <p>
          Vous restez propriétaire de tout le contenu que vous créez sur Make Your List (tâches, notes, etc.).
          Nous ne revendiquons aucun droit de propriété sur votre contenu. Vous nous accordez
          uniquement le droit de stocker et afficher ce contenu dans le cadre du service.
        </p>
      </Section>

      <Section title="Abonnements et paiement">
        <p>
          Les plans payants sont facturés mensuellement. Vous pouvez changer de plan ou annuler
          à tout moment. En cas de downgrade, vous conservez l'accès aux fonctionnalités payantes
          jusqu'à la fin de la période en cours. Aucun remboursement n'est effectué pour les
          périodes entamées.
        </p>
      </Section>

      <Section title="Disponibilité du service">
        <p>
          Nous nous efforçons de maintenir le service disponible 24h/24, mais ne garantissons pas
          une disponibilité ininterrompue. Des interruptions peuvent survenir pour maintenance,
          mises à jour ou en cas de force majeure.
        </p>
      </Section>

      <Section title="Limitation de responsabilité">
        <p>
          Le service est fourni « tel quel ». Dans les limites autorisées par la loi, nous déclinons
          toute responsabilité pour les dommages indirects, pertes de données ou manque à gagner
          liés à l'utilisation du service.
        </p>
      </Section>

      <Section title="Modification des CGU">
        <p>
          Nous nous réservons le droit de modifier ces CGU à tout moment. Les utilisateurs seront
          informés des modifications significatives. La poursuite de l'utilisation du service après
          modification vaut acceptation des nouvelles conditions.
        </p>
      </Section>

      <Section title="Droit applicable">
        <p>
          Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux
          français seront seuls compétents.
        </p>
      </Section>
    </LegalLayout>
  )
}
