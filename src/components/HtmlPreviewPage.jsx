import { useEffect, useState } from 'react'
import { ShieldAlert, Loader2, ExternalLink, FileCode2, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Detect any executable / interactive script content in an HTML string.
// Returns an array of reasons (empty = clean).
export function scanHtmlForScripts(html) {
  const reasons = []
  if (!html) return reasons
  if (/<script\b[^>]*>/i.test(html)) reasons.push('Balise <script> détectée')
  if (/\son[a-z]+\s*=\s*["'][^"']*["']/i.test(html)) reasons.push('Gestionnaire d\'événement inline (on...=) détecté')
  if (/\son[a-z]+\s*=\s*[^"'\s>]+/i.test(html)) reasons.push('Gestionnaire d\'événement inline non-quoté détecté')
  if (/(href|src|action|formaction)\s*=\s*["']?\s*javascript:/i.test(html)) reasons.push('URL javascript: détectée')
  if (/<iframe\b[^>]*>/i.test(html)) reasons.push('Balise <iframe> détectée')
  if (/<(object|embed)\b[^>]*>/i.test(html)) reasons.push('Balise <object> ou <embed> détectée')
  if (/data:text\/html/i.test(html)) reasons.push('Data URI text/html détectée')
  return reasons
}

// Build a URL to the preview page from a storage_path + filename
export function buildHtmlPreviewUrl(storagePath, fileName) {
  const params = new URLSearchParams()
  if (storagePath) params.set('path', storagePath)
  if (fileName) params.set('name', fileName)
  return `/preview-html?${params.toString()}`
}

export default function HtmlPreviewPage() {
  const params = new URLSearchParams(window.location.search)
  const storagePath = params.get('path') || ''
  const fileName = params.get('name') || 'Aperçu HTML'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [html, setHtml] = useState('')
  const [scriptReasons, setScriptReasons] = useState([])
  const [publicUrl, setPublicUrl] = useState('')

  useEffect(() => {
    document.title = `${fileName} — Aperçu`
  }, [fileName])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        if (!storagePath) throw new Error('Paramètre "path" manquant')
        const { data } = supabase.storage.from('attachments').getPublicUrl(storagePath)
        const url = data?.publicUrl
        if (!url) throw new Error('URL introuvable')
        setPublicUrl(url)
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        if (cancelled) return
        setScriptReasons(scanHtmlForScripts(text))
        setHtml(text)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Erreur de chargement')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [storagePath])

  const blocked = scriptReasons.length > 0

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-white/10 bg-card/60 backdrop-blur-sm shrink-0">
        <button
          onClick={() => { if (window.history.length > 1) window.history.back(); else window.close() }}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent border-none text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
          title="Retour"
        >
          <ArrowLeft size={15} />
        </button>
        <FileCode2 size={16} className="text-blue-400 shrink-0" />
        <span className="text-sm font-semibold text-foreground truncate flex-1">{fileName}</span>
        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.7rem] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors no-underline"
            title="Ouvrir le fichier brut dans un nouvel onglet"
          >
            <ExternalLink size={11} /> Fichier brut
          </a>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 size={32} className="animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-destructive p-6 text-center">
            <ShieldAlert size={40} />
            <div>
              <p className="text-base font-semibold mb-1">Impossible de charger le fichier</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && blocked && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 max-w-md text-center">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                <ShieldAlert size={40} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">Script détecté</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ce fichier HTML contient du code potentiellement exécutable. L'aperçu a été bloqué pour protéger votre navigateur et votre compte.
                </p>
              </div>
              <div className="w-full bg-muted/40 border border-amber-500/20 rounded-xl p-4 text-left">
                <p className="text-[0.68rem] font-semibold text-amber-400 uppercase tracking-wider mb-2">Raisons</p>
                <ul className="text-[0.78rem] text-muted-foreground space-y-1">
                  {scriptReasons.map((r, i) => <li key={i}>• {r}</li>)}
                </ul>
              </div>
              <p className="text-[0.7rem] text-muted-foreground/70">
                Vous pouvez toujours télécharger le fichier brut via le bouton ci-dessus si vous lui faites confiance.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && !blocked && (
          <iframe
            title={fileName}
            srcDoc={html}
            sandbox=""
            className="flex-1 w-full h-full bg-white border-none block"
            style={{ minHeight: 0 }}
          />
        )}
      </div>
    </div>
  )
}
