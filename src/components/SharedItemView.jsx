import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { StickyNote, FileText, Columns3, CheckSquare, Circle, Check, Clock, Star, Link2, ArrowLeft, Edit3, Eye, Save, Calendar } from 'lucide-react'
import { cn } from '../lib/utils'
import { PRIORITIES, TAG_COLORS } from '../lib/constants'
import Loader from './Loader'

const STATUS_ICONS = { todo: Circle, doing: Clock, done: Check }
const PRIORITY_COLORS = { low: '#51cf66', medium: '#ffd43b', high: '#ff6b6b', urgent: '#e03131' }

export default function SharedItemView({ item, onBack }) {
  const [liveData, setLiveData] = useState(item.item)
  const [tasks, setTasks] = useState([])
  const [notes, setNotes] = useState([])
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const isEditor = item.role === 'editor'
  const TYPE_LABELS = { note: 'Note partagée', list: 'Liste partagée', kanban: 'Kanban partagé' }

  // Fetch full data for the item
  useEffect(() => {
    async function fetchFull() {
      setLoading(true)
      if (item.item_type === 'note') {
        const { data } = await supabase.from('notes').select('*').eq('id', item.item_id).single()
        if (data) setLiveData(data)
      } else if (item.item_type === 'list') {
        const { data: list } = await supabase.from('lists').select('*').eq('id', item.item_id).single()
        if (list) setLiveData(list)
        const { data: t } = await supabase.from('tasks').select('*, subtasks(*)').eq('list_id', item.item_id).order('position')
        setTasks(t || [])
      } else if (item.item_type === 'kanban') {
        const { data: board } = await supabase.from('kanban_boards').select('*').eq('id', item.item_id).single()
        if (board) setLiveData(board)
        const { data: t } = await supabase.from('tasks').select('*, subtasks(*)').eq('kanban_board_id', item.item_id)
        setTasks(t || [])
        const { data: n } = await supabase.from('notes').select('*').eq('kanban_board_id', item.item_id).not('kanban_status', 'is', null)
        setNotes(n || [])
        // Fetch lists for task list-name badges
        const listIds = [...new Set((t || []).map(x => x.list_id).filter(Boolean))]
        if (listIds.length > 0) {
          const { data: l } = await supabase.from('lists').select('id, name').in('id', listIds)
          setLists(l || [])
        }
      }
      setLoading(false)
    }
    fetchFull()
  }, [item.item_id, item.item_type])

  if (loading) {
    return (
      <Loader />
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto page-transition">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-6 py-3">
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer transition-colors"
            onClick={onBack}
          >
            <ArrowLeft size={14} /> Retour
          </button>
          <div className="w-px h-4 bg-border" />
          {item.item_type === 'note' && <StickyNote size={14} className="text-blue-400" />}
          {item.item_type === 'list' && <FileText size={14} className="text-violet-400" />}
          {item.item_type === 'kanban' && <Columns3 size={14} className="text-amber-400" />}
          <span className="text-xs font-semibold text-muted-foreground">{TYPE_LABELS[item.item_type]}</span>
          <span className="text-[0.6rem] text-muted-foreground/60">· {item.project_name}</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[0.6rem] text-muted-foreground/60">par {item.sharer_name}</span>
            <span className={`text-[0.6rem] px-2 py-0.5 rounded-full font-semibold ${isEditor ? 'bg-blue-500/15 text-blue-400' : 'bg-violet-500/15 text-violet-400'}`}>
              {isEditor ? 'Éditeur' : 'Lecture seule'}
            </span>
          </div>
        </div>
      </div>

      {item.item_type === 'kanban' ? (
        <SharedKanbanContent board={liveData} tasks={tasks} notes={notes} lists={lists} />
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {item.item_type === 'note' && <SharedNoteContent note={liveData} isEditor={isEditor} />}
          {item.item_type === 'list' && <SharedListContent list={liveData} tasks={tasks} isEditor={isEditor} />}
        </div>
      )}
    </div>
  )
}

function SharedNoteContent({ note, isEditor }) {
  const dateStr = (note.updated_at || note.updatedAt)
    ? new Date(note.updated_at || note.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 pb-6 border-b border-white/10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.65rem] font-semibold mb-4"
          style={{ background: `${note.color || '#8b5cf6'}18`, color: note.color || '#8b5cf6' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: note.color || '#8b5cf6' }} />
          Note
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{note.title || 'Sans titre'}</h1>
        {dateStr && <p className="text-xs text-muted-foreground">Dernière modification : {dateStr}</p>}
      </div>
      <div
        className="text-[0.92rem] leading-[1.8] text-foreground/85 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:text-foreground [&>h1]:mt-8 [&>h1]:mb-3 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:text-foreground [&>h2]:mt-6 [&>h2]:mb-2 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-foreground/90 [&>h3]:mt-5 [&>h3]:mb-2 [&>p]:mb-3 [&>ul]:pl-6 [&>ul]:list-disc [&>ul]:my-3 [&>ol]:pl-6 [&>ol]:list-decimal [&>ol]:my-3 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-3 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_code]:bg-white/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_pre]:bg-white/[0.04] [&_pre]:border [&_pre]:border-white/10 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0"
        dangerouslySetInnerHTML={{ __html: note.content || '' }}
      />
    </div>
  )
}

function SharedListContent({ list, tasks, isEditor }) {
  const doneCount = tasks.filter(t => t.status === 'done').length
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <FileText size={20} className="text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{list.name}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{doneCount}/{tasks.length} terminée{tasks.length !== 1 ? 's' : ''}</p>
      <div className="flex flex-col gap-2">
        {tasks.map(t => {
          const StatusIcon = STATUS_ICONS[t.status] || Circle
          const subtasks = t.subtasks || []
          return (
            <div key={t.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 transition-colors hover:bg-white/[0.05]">
              <div className="flex items-start gap-3">
                <StatusIcon size={16} className={`shrink-0 mt-0.5 ${t.status === 'done' ? 'text-emerald-400' : t.status === 'doing' ? 'text-amber-400' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${t.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.text}</span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {t.priority && t.priority !== 'medium' && (
                      <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: `${PRIORITY_COLORS[t.priority]}20`, color: PRIORITY_COLORS[t.priority] }}>
                        {t.priority}
                      </span>
                    )}
                    {t.due_date && <span className="text-[0.6rem] text-muted-foreground">{new Date(t.due_date).toLocaleDateString('fr-FR')}</span>}
                    {(t.tags || []).map(tag => <span key={tag} className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">{tag}</span>)}
                    {t.starred && <Star size={10} className="text-amber-400 fill-amber-400" />}
                  </div>
                  {subtasks.length > 0 && (
                    <div className="mt-2 pl-1 flex flex-col gap-1">
                      {subtasks.map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-xs">
                          {s.done ? <Check size={12} className="text-emerald-400" /> : <Circle size={12} className="text-muted-foreground" />}
                          <span className={s.done ? 'line-through text-muted-foreground' : 'text-foreground/70'}>{s.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {tasks.length === 0 && <p className="text-center text-muted-foreground py-8">Liste vide</p>}
      </div>
    </div>
  )
}

function SharedKanbanContent({ board, tasks, notes, lists }) {
  const DEFAULT_COLUMNS = [
    { id: 'todo', label: 'A faire', color: '#a78bfa' },
    { id: 'doing', label: 'En cours', color: '#60a5fa' },
    { id: 'done', label: 'Terminee', color: '#4ade80' },
  ]
  const columns = (board.columns && board.columns.length > 0) ? board.columns : DEFAULT_COLUMNS
  const getTaskCol = (t) => t.kanban_col || t.status || 'todo'
  const isOverdue = (d) => d && new Date(d) < new Date(new Date().toDateString())
  const linkedNoteIds = new Set(tasks.filter(t => t.linked_note_id).map(t => t.linked_note_id))

  const kanbanTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const kanbanNotes = (notes || []).length
  const totalItems = kanbanTasks + kanbanNotes
  const doneItems = doneTasks + (notes || []).filter(n => n.kanban_status === 'done').length
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header — identical to real KanbanBoard */}
      <div className="px-8 pt-6 pb-2 max-md:px-4 shrink-0">
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
      </div>

      {/* Kanban columns — identical to real KanbanBoard */}
      <div className="flex gap-4 flex-1 overflow-x-auto overflow-y-hidden px-8 pb-6 pt-4 max-md:px-4">
        {columns.map(col => {
          const colTasks = tasks.filter(t => getTaskCol(t) === col.id)
          const colNotes = (notes || []).filter(n => !linkedNoteIds.has(n.id) && n.kanban_status === col.id)
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
                    const lnote = t.linked_note_id ? (notes || []).find(n => n.id === t.linked_note_id) : null
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
