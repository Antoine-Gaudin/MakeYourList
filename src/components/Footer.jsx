import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 shrink-0">
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/25">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 12.5 L9.5 16.5 L18.5 6.5"/></svg>
              </div>
              <span className="font-bold text-sm">Make Your List</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Organisez vos projets, tâches et notes en un seul endroit. Simple, rapide, efficace.
            </p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Produit</h4>
            <div className="flex flex-col gap-2">
              <Link to="/decouvrir" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">Fonctionnalites</Link>
              <Link to="/tarifs" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">Tarifs</Link>
              <Link to="/inscription" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">Creer un compte</Link>
              <Link to="/connexion" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">Se connecter</Link>
            </div>
          </div>

          {/* Fonctionnalites */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Fonctionnalites</h4>
            <div className="flex flex-col gap-2">
              <Link to="/fonctionnalite/listes" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">Listes de taches</Link>
              <Link to="/fonctionnalite/kanban" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">Vue Kanban</Link>
              <Link to="/fonctionnalite/notes" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">Notes</Link>
              <Link to="/fonctionnalite/partage" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">Partage</Link>
              <Link to="/fonctionnalite/export" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">Export de notes</Link>
              <Link to="/fonctionnalite/api" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">API REST</Link>
              <Link to="/fonctionnalite/mobile" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">Application mobile</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Legal</h4>
            <div className="flex flex-col gap-2">
              <Link to="/mentions-legales" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">Mentions legales</Link>
              <Link to="/confidentialite" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">Confidentialite</Link>
              <Link to="/cgu" className="text-xs text-muted-foreground hover:text-primary transition-colors no-underline">CGU</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[0.65rem] text-muted-foreground/60">
            &copy; {new Date().getFullYear()} Make Your List. Tous droits reserves.
          </p>
          <p className="text-[0.65rem] text-muted-foreground/60 flex items-center gap-1">
            Fait avec <Heart size={9} className="text-destructive" /> en France
          </p>
        </div>
      </div>
    </footer>
  )
}
