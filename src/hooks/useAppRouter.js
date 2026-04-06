import { useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const TAB_PATHS = {
  '/taches': 'todos',
  '/kanban': 'kanban',
  '/notes': 'notes',
  '/favoris': 'favorites',
  '/activite': 'activity',
  '/api': 'api',
  '/partages': 'shared',
  '/invitations': 'invitations',
}

const TAB_TO_PATH = Object.fromEntries(Object.entries(TAB_PATHS).map(([k, v]) => [v, k]))

function parseLocation(pathname) {
  let json = false
  let clean = pathname
  if (clean.endsWith('.json')) {
    json = true
    clean = clean.slice(0, -5)
  }

  const parts = clean.split('/').filter(Boolean)
  if (parts.length === 0) return { tab: 'todos', json }

  const base = '/' + parts[0]
  const tab = TAB_PATHS[base]
  if (!tab) return { tab: null, notFound: true, json }

  const result = { tab, json }

  if (tab === 'todos') {
    let i = 1
    if (parts[i] === 'dossier' && parts[i + 1]) { result.folderId = parts[i + 1]; i += 2 }
    if (parts[i] === 'liste' && parts[i + 1]) {
      result.listId = parts[i + 1]; i += 2
      if (parts[i] === 'tache' && parts[i + 1]) { result.taskId = parts[i + 1]; i += 2 }
    }
  }

  if (tab === 'kanban') {
    let i = 1
    if (parts[i] === 'dossier' && parts[i + 1]) { result.folderId = parts[i + 1]; i += 2 }
    if (parts[i] === 'board' && parts[i + 1]) { result.boardId = parts[i + 1]; i += 2 }
  }

  if (tab === 'notes') {
    let i = 1
    if (parts[i] === 'dossier' && parts[i + 1]) { result.folderId = parts[i + 1]; i += 2 }
    if (parts[i]) { result.noteId = parts[i]; i += 1 }
  }

  if (tab === 'api' && parts[1]) {
    result.apiSection = parts[1]
  }

  return result
}

function buildPath(tab, params = {}) {
  const base = TAB_TO_PATH[tab] || '/taches'
  let path = base

  if (tab === 'todos') {
    if (params.folderId) path += `/dossier/${params.folderId}`
    if (params.listId) {
      path += `/liste/${params.listId}`
      if (params.taskId) path += `/tache/${params.taskId}`
    }
  }

  if (tab === 'kanban') {
    if (params.folderId) path += `/dossier/${params.folderId}`
    if (params.boardId) path += `/board/${params.boardId}`
  }

  if (tab === 'notes') {
    if (params.folderId) path += `/dossier/${params.folderId}`
    if (params.noteId) path += `/${params.noteId}`
  }

  if (tab === 'api' && params.apiSection) {
    path += `/${params.apiSection}`
  }

  return path
}

export function useAppRouter() {
  const navigate = useNavigate()
  const location = useLocation()

  const state = useMemo(() => parseLocation(location.pathname), [location.pathname])

  const goTo = useCallback((tab, params = {}) => {
    navigate(buildPath(tab, params))
  }, [navigate])

  const replaceTo = useCallback((tab, params = {}) => {
    navigate(buildPath(tab, params), { replace: true })
  }, [navigate])

  return { ...state, goTo, replaceTo }
}
