import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePageMeta } from '../hooks/usePageMeta'
import { FileText, Columns3, StickyNote, CheckSquare, Circle, Check, Clock, AlertCircle, Star, ChevronRight, XCircle, ArrowLeft, Link2, Calendar, Paperclip, File, Image } from 'lucide-react'
import { cn } from '../lib/utils'
import { PRIORITIES, TAG_COLORS } from '../lib/constants'
import Loader from './Loader'

const STATUS_LABELS = { todo: 'A faire', doing: 'En cours', done: 'Termine' }

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo'
}

function getFileIcon(fileType) {
  if (fileType?.startsWith('image/')) return <Image size={14} className="text-emerald-400" />
  return <File size={14} className="text-blue-400" />
}
const STATUS_ICONS = { todo: Circle, doing: Clock, done: Check }
const PRIORITY_COLORS = { low: '#51cf66', medium: '#ffd43b', high: '#ff6b6b', urgent: '#e03131' }

function SharedNote({ data }) {
  const note = data
  if (!note) return null
  const updatedAt = note.updated_at || note.updatedAt
  const dateStr = updatedAt ? new Date(updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null
  const attachments = note.attachments || []

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 pb-6 border-b border-white/10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.65rem] font-semibold mb-4" style={{ background: `${note.color || '#8b5cf6'}18`, color: note.color || '#8b5cf6' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: note.color || '#8b5cf6' }} />
          MAKE YOUR LIST
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{note.title || 'Sans titre'}</h1>
        {dateStr && <p className="text-xs text-muted-foreground">Dernière modification : {dateStr}</p>}
      </div>
      <div
        className="text-[0.92rem] leading-[1.8] text-foreground/85 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:text-foreground [&>h1]:mt-8 [&>h1]:mb-3 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:text-foreground [&>h2]:mt-6 [&>h2]:mb-2 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-foreground/90 [&>h3]:mt-5 [&>h3]:mb-2 [&>p]:mb-3 [&>ul]:pl-6 [&>ul]:list-disc [&>ul]:my-3 [&>ol]:pl-6 [&>ol]:list-decimal [&>ol]:my-3 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-3 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_code]:bg-white/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_pre]:bg-white/[0.04] [&_pre]:border [&_pre]:border-white/10 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_img]:max-w-full [&_img]:rounded-lg [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_th]:border [&_th]:border-white/10 [&_th]:bg-white/[0.04] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm"
        dangerouslySetInnerHTML={{ __html: note.content || '' }}
      />
      {attachments.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
            <Paperclip size={13} className="text-amber-400" />
            <span className="font-semibold text-amber-400">{attachments.length} pièce{attachments.length > 1 ? 's' : ''} jointe{attachments.length > 1 ? 's' : ''}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {attachments.map(att => {
              const url = supabase.storage.from('attachments').getPublicUrl(att.storage_path).data.publicUrl
              return (
                <a
                  key={att.id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.72rem] font-medium bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors no-underline"
                >
                  {getFileIcon(att.file_type)}
                  <span className="truncate max-w-[160px]">{att.file_name}</span>
                  <span className="text-[0.58rem] text-muted-foreground/60">{formatFileSize(att.file_size)}</span>
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function SharedList({ data }) {
  const { list, tasks } = data || {}
  if (!list) return null
  const tasksList = tasks || []
  const doneCount = tasksList.filter(t => t.status === 'done').length
  const doingCount = tasksList.filter(t => t.status === 'doing').length
  const todoCount = tasksList.filter(t => t.status === 'todo').length
  const pct = tasksList.length > 0 ? Math.round((doneCount / tasksList.length) * 100) : 0
  const PRIO_LABELS = { low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente' }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10 pb-8 border-b border-white/10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.65rem] font-semibold mb-4" style={{ background: '#8b5cf618', color: '#8b5cf6' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#8b5cf6' }} />
          MAKE YOUR LIST
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">{list.name}</h1>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-bold text-foreground">{pct}%</span>
            <span className="text-muted-foreground">complétée</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-400" />{todoCount} à faire</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" />{doingCount} en cours</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />{doneCount} terminée{doneCount > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
          {tasksList.length > 0 && (
            <>
              <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              {doingCount > 0 && <div className="absolute top-0 h-full bg-blue-400/40 rounded-full" style={{ left: `${pct}%`, width: `${Math.round((doingCount / tasksList.length) * 100)}%` }} />}
            </>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2.5">
        {tasksList.map((t, i) => {
          const StatusIcon = STATUS_ICONS[t.status] || Circle
          const subtasks = t.subtasks || []
          const subsDone = subtasks.filter(s => s.done).length
          const statusColor = t.status === 'done' ? '#4ade80' : t.status === 'doing' ? '#60a5fa' : '#a78bfa'
          const isOverdue = t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date(new Date().toDateString())

          return (
            <div key={t.id} className="group relative border border-white/[0.07] rounded-2xl p-4 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.02]" style={{ borderLeftWidth: 3, borderLeftColor: statusColor + '60', background: `linear-gradient(135deg, ${statusColor}04, transparent)` }}>
              <div className="flex items-start gap-3.5">
                {/* Status indicator */}
                <div className="flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0 mt-0.5" style={{ background: statusColor + '15', borderColor: statusColor + '40', color: statusColor }}>
                  {t.status === 'done' ? <Check size={13} /> : t.status === 'doing' ? <Clock size={13} /> : <Circle size={13} />}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Task text + star */}
                  <div className="flex items-start gap-2">
                    <span className={cn("text-[0.88rem] font-medium leading-snug flex-1", t.status === 'done' ? 'line-through text-muted-foreground/50' : 'text-foreground')}>{t.text}</span>
                    {t.starred && <Star size={13} className="text-amber-400 fill-amber-400 shrink-0 mt-0.5" />}
                  </div>

                  {/* Meta badges */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {t.priority && t.priority !== 'medium' && (
                      <span className="text-[0.62rem] px-2 py-0.5 rounded-lg font-semibold" style={{ background: `${PRIORITY_COLORS[t.priority]}18`, color: PRIORITY_COLORS[t.priority] }}>
                        {PRIO_LABELS[t.priority] || t.priority}
                      </span>
                    )}
                    {t.due_date && (
                      <span className={cn("inline-flex items-center gap-1 text-[0.62rem] px-2 py-0.5 rounded-lg", isOverdue ? "bg-red-500/15 text-red-400 font-semibold" : "bg-white/[0.06] text-muted-foreground")}>
                        <Calendar size={10} />
                        {new Date(t.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {(t.tags || []).map(tag => (
                      <span key={tag} className="text-[0.62rem] px-2 py-0.5 rounded-lg font-semibold bg-violet-500/12 text-violet-400">{tag}</span>
                    ))}
                    {subtasks.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[0.62rem] px-2 py-0.5 rounded-lg bg-white/[0.06] text-muted-foreground">
                        <Check size={10} /> {subsDone}/{subtasks.length}
                        <span className="inline-block w-10 h-1 bg-white/10 rounded-full overflow-hidden">
                          <span className="block h-full rounded-full bg-emerald-400/70" style={{ width: `${(subsDone / subtasks.length) * 100}%` }} />
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Notes */}
                  {t.notes && <p className="text-xs text-muted-foreground/50 mt-2 italic leading-relaxed">{t.notes}</p>}

                  {/* Subtasks */}
                  {subtasks.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex flex-col gap-1.5">
                      {subtasks.map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-xs">
                          {s.done ? <Check size={11} className="text-emerald-400 shrink-0" /> : <Circle size={11} className="text-muted-foreground/40 shrink-0" />}
                          <span className={s.done ? 'line-through text-muted-foreground/40' : 'text-foreground/70'}>{s.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Linked note */}
                  {t.linked_note_id && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 text-[0.62rem] px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 font-semibold">
                      <Link2 size={10} />
                      Note liée
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {tasksList.length === 0 && (
          <div className="text-center py-16 text-muted-foreground/40">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Cette liste est vide</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SharedKanban({ data }) {
  const { board, tasks, notes, lists: listsData } = data || {}
  if (!board) return null
  const DEFAULT_COLUMNS = [
    { id: 'todo', label: 'A faire', color: '#a78bfa' },
    { id: 'doing', label: 'En cours', color: '#60a5fa' },
    { id: 'done', label: 'Terminee', color: '#4ade80' },
  ]
  const columns = (board.columns && board.columns.length > 0) ? board.columns : DEFAULT_COLUMNS
  const getTaskCol = (t) => t.kanban_col || t.status || 'todo'
  const isOverdue = (d) => d && new Date(d) < new Date(new Date().toDateString())
  const tasksList = tasks || []
  const notesList = notes || []
  const lists = listsData || []
  const linkedNoteIds = new Set(tasksList.filter(t => t.linked_note_id).map(t => t.linked_note_id))

  const kanbanTasks = tasksList.length
  const doneTasks = tasksList.filter(t => t.status === 'done').length
  const kanbanNotes = notesList.length
  const totalItems = kanbanTasks + kanbanNotes
  const doneItems = doneTasks + notesList.filter(n => n.kanban_status === 'done').length
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  return (
    <div className="w-full">
      {/* Header — identical to real KanbanBoard */}
      <div className="flex items-center gap-5 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
        </div>
        <div className="flex items-center gap-2.5 max-sm:hidden">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckSquare size={13} className="text-primary/60" /> {doneTasks}/{kanbanTasks}
            <span className="text-border mx-1">|</span>
            <StickyNote size={13} className="text-blue-400/60" /> {kanbanNotes}
          </div>
          <div className="w-28 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full progress-gradient rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-semibold text-primary">{pct}%</span>
        </div>
      </div>

      {/* Kanban columns — identical to real KanbanBoard */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-4">
        {columns.map(col => {
          const colTasks = tasksList.filter(t => getTaskCol(t) === col.id)
          const colNotes = notesList.filter(n => !linkedNoteIds.has(n.id) && n.kanban_status === col.id)
          const cards = [...colTasks.map(t => ({ type: 'task', data: t })), ...colNotes.map(n => ({ type: 'note', data: n }))]

          return (
            <div key={col.id}
              className="flex-1 min-w-[290px] max-w-[420px] border border-white/10 rounded-2xl flex flex-col kanban-col-tinted"
              style={{ '--col-tint': col.color + '0A', background: `linear-gradient(180deg, ${col.color}08 0%, var(--color-card)15 100%)` }}>
              {/* Column header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b font-semibold text-sm rounded-t-2xl select-none"
                style={{ borderBottomColor: col.color + '40', background: `linear-gradient(135deg, ${col.color}18, ${col.color}08)` }}>
                <span className="w-3 h-3 rounded-full" style={{ background: col.color, boxShadow: `0 0 10px ${col.color}50, 0 0 3px ${col.color}30` }} />
                <span className="text-[0.82rem]">{col.label || col.name}</span>
                <span className="ml-auto text-[0.7rem] text-muted-foreground bg-muted/80 px-2.5 py-0.5 rounded-lg font-semibold">{cards.length}</span>
              </div>

              {/* Column body */}
              <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5 kanban-column-body min-h-[100px]">
                {cards.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: col.color + '12', color: col.color + '80' }}>
                      {col.id === 'done' ? <Check size={18} /> : col.id === 'doing' ? <Clock size={18} /> : <Circle size={18} />}
                    </div>
                    <span className="text-xs">Aucun element</span>
                  </div>
                )}

                {cards.map((card, i) => {
                  if (card.type === 'task') {
                    const t = card.data
                    const prio = PRIORITIES.find(p => p.value === t.priority)
                    const overdue = t.status !== 'done' && isOverdue(t.due_date)
                    const subtasks = t.subtasks || []
                    const subsDone = subtasks.filter(s => s.done).length
                    const tags = t.tags || []
                    const lnote = t.linked_note_id ? notesList.find(n => n.id === t.linked_note_id) : null
                    const list = lists.find(l => l.id === t.list_id)

                    return (
                      <div key={t.id}
                        className={cn("group relative border border-white/10 rounded-xl transition-all duration-150 hover:border-violet-500/30 hover:shadow-md hover:shadow-violet-500/5 hover:-translate-y-px", `priority-bar-${t.priority}`, "px-3.5 py-3")}
                        style={{ animationDelay: `${i * 40}ms` }}>
                        <div className="flex items-start gap-2.5">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 shrink-0 mt-0.5"
                            style={{ background: col.color + '20', color: col.color, borderColor: col.color + '50', boxShadow: `0 0 8px ${col.color}15` }}>
                            {t.status === 'done' ? <Check size={11} /> : t.status === 'doing' ? <Clock size={11} /> : <Circle size={11} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("text-[0.82rem] font-medium leading-snug break-words flex-1", t.status === 'done' && "line-through text-muted-foreground/60")}>{t.text}</span>
                              {lnote && <span className="inline-flex items-center gap-0.5 text-[0.5rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 shrink-0"><Link2 size={8} /> Liee</span>}
                            </div>
                            {list && <span className="inline-flex items-center gap-1 text-[0.6rem] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded mt-1.5"><CheckSquare size={8} /> {list.name}</span>}
                            {tags.length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">{tags.map(tagName => { const tc = TAG_COLORS.find(x => x.name === tagName); return <span key={tagName} className="text-[0.6rem] px-2 py-0.5 rounded-lg font-semibold" style={{ background: (tc?.color || '#8b5cf6') + '15', color: tc?.color || '#8b5cf6' }}>{tagName}</span> })}</div>}
                            <div className="flex items-center gap-2 flex-wrap mt-1.5">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: prio?.color }} />
                              {t.starred && <Star size={10} className="text-warning shrink-0 fill-warning" />}
                              {t.due_date && <span className={cn("inline-flex items-center gap-1 text-[0.65rem]", overdue ? "text-destructive font-semibold" : "text-muted-foreground")}><Calendar size={10} />{new Date(t.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                              {subtasks.length > 0 && <span className="inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground"><Check size={10} /> {subsDone}/{subtasks.length}<span className="inline-block w-10 h-1 bg-muted rounded-full overflow-hidden"><span className="block h-full rounded-full bg-success/70 transition-all" style={{ width: `${(subsDone / subtasks.length) * 100}%` }} /></span></span>}
                            </div>
                          </div>
                        </div>
                        {/* Linked note preview */}
                        {lnote && (
                          <div className="mt-2 pt-2 border-t border-white/8">
                            <div className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center mt-0.5" style={{ background: (lnote.color || '#8b5cf6') + '20', color: lnote.color || '#8b5cf6' }}><StickyNote size={10} /></div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[0.7rem] font-medium truncate block">{lnote.title || 'Sans titre'}</span>
                                {lnote.content && <p className="text-[0.6rem] text-muted-foreground/50 leading-snug mt-0.5 line-clamp-1">{lnote.content.slice(0, 60)}</p>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }

                  // NOTE CARD
                  const n = card.data
                  return (
                    <div key={n.id}
                      className="group relative border border-white/10 rounded-xl transition-all duration-150 hover:border-violet-500/30 hover:shadow-md hover:shadow-violet-500/5 kanban-note-card px-3.5 py-3"
                      style={{ borderLeftColor: n.color || '#8b5cf6', background: `linear-gradient(135deg, ${n.color || '#8b5cf6'}0A, var(--color-card))`, animationDelay: `${i * 40}ms` }}>
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg shrink-0 mt-0.5 flex items-center justify-center" style={{ background: (n.color || '#8b5cf6') + '20', color: n.color || '#8b5cf6' }}><StickyNote size={12} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[0.55rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: (n.color || '#8b5cf6') + '15', color: n.color || '#8b5cf6' }}>Note</span>
                            {n.starred && <Star size={9} className="text-warning fill-warning" />}
                          </div>
                          <span className="block text-[0.82rem] font-medium leading-snug break-words mt-1">{n.title || 'Sans titre'}</span>
                          {n.content && <p className="text-[0.7rem] text-muted-foreground/60 leading-snug mt-1 line-clamp-2">{n.content.slice(0, 100)}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SharedView({ token }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const TYPE_TITLES = { note: 'Note partagée', list: 'Liste partagée', kanban: 'Kanban partagé' }
  usePageMeta({
    title: data ? TYPE_TITLES[data.type] || 'Contenu partagé' : 'Contenu partagé',
    description: 'Consultez un élément partagé sur Make Your List.',
    path: `/share/${token}`,
  })

  useEffect(() => {
    async function load() {
      if (!/^[a-f0-9]{40,64}$/.test(token)) {
        setError('Lien invalide ou expiré.')
        setLoading(false)
        return
      }
      const { data: result, error: err } = await supabase.rpc('get_shared_item', { share_token: token })
      if (err || !result || result.error) {
        setError(result?.error === 'item_deleted' ? 'Cet élément a été supprimé.' : 'Lien invalide ou expiré.')
      } else {
        setData(result)
      }
      setLoading(false)
    }
    load()
  }, [token])

  const goHome = () => {
    navigate('/')
  }

  if (loading) {
    return (
      <Loader fullScreen />
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <XCircle size={48} className="text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">{error}</h2>
          <button onClick={goHome} className="mt-4 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 rounded-lg text-sm font-semibold cursor-pointer border-none hover:shadow-violet-500/40 hover:brightness-110 transition-all">
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  const TYPE_LABELS = { note: 'Note partagée', list: 'Liste partagée', kanban: 'Kanban partagé' }
  const TYPE_ICONS = { note: StickyNote, list: FileText, kanban: Columns3 }
  const TypeIcon = TYPE_ICONS[data.type] || FileText

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={goHome} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer transition-colors">
            <ArrowLeft size={14} /> Accueil
          </button>
          <div className="w-px h-4 bg-border" />
          <TypeIcon size={14} className="text-primary" />
          <span className="text-xs font-semibold text-muted-foreground">{TYPE_LABELS[data.type]}</span>
          <span className="ml-auto text-[0.6rem] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">Lecture seule</span>
        </div>
      </header>

      {data.type === 'kanban' ? (
        <main className="flex flex-col flex-1 overflow-hidden px-8 py-6 max-md:px-4">
          <SharedKanban data={data.data} />
        </main>
      ) : (
        <main className="max-w-5xl mx-auto px-4 py-8">
          {data.type === 'note' && <SharedNote data={data.data} />}
          {data.type === 'list' && <SharedList data={data.data} />}
        </main>
      )}
    </div>
  )
}
