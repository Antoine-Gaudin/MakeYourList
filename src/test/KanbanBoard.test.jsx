import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import KanbanBoard from '../components/KanbanBoard'

vi.mock('../contexts/ProjectContext', () => ({
  useProject: () => ({ myRole: 'owner', members: [], activeProject: { id: 'p1' } }),
}))

vi.mock('../contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ canCreateKanbanBoard: () => true, plan: 'pro', limits: { kanbanBoards: 999 } }),
}))

const defaultProps = (overrides = {}) => ({
  lists: [{ id: 'list-1', name: 'Ma liste', folderId: null }],
  allTodos: [],
  setAllTodos: vi.fn(),
  notes: [],
  setNotes: vi.fn(),
  logActivity: vi.fn(),
  showToast: vi.fn(),
  dbUpdateTodo: vi.fn(),
  dbAddTodo: vi.fn(),
  dbUpdateNote: vi.fn(),
  dbAddNote: vi.fn(),
  kanbanBoards: [],
  kanbanFolders: [],
  setKanbanFolders: vi.fn(),
  dbAddKanbanBoard: vi.fn(),
  dbUpdateKanbanBoard: vi.fn(),
  dbDeleteKanbanBoard: vi.fn(),
  dbAddFolder: vi.fn(),
  dbDeleteFolder: vi.fn(),
  ...overrides,
})

describe('KanbanBoard - Browser view', () => {
  it('renders the browser with title', () => {
    render(<KanbanBoard {...defaultProps()} />)
    expect(screen.getByText('Kanban')).toBeInTheDocument()
  })

  it('shows empty state when no boards', () => {
    render(<KanbanBoard {...defaultProps()} />)
    const matches = screen.getAllByText(/Aucun board|Creez votre premier|Nouveau board/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('displays boards in the browser', () => {
    const kanbanBoards = [{
      id: 'board-1', name: 'Mon board', folderId: null,
      columns: [{ id: 'todo', label: 'A faire', color: '#a78bfa' }],
      position: 0, createdAt: Date.now(), updatedAt: Date.now(),
    }]
    render(<KanbanBoard {...defaultProps({ kanbanBoards })} />)
    expect(screen.getByText('Mon board')).toBeInTheDocument()
  })

  it('displays folders in the browser', () => {
    const kanbanFolders = [{ id: 'folder-1', name: 'Sprint' }]
    const { container } = render(<KanbanBoard {...defaultProps({ kanbanFolders })} />)
    expect(container.textContent).toContain('Sprint')
  })

  it('calls dbAddKanbanBoard when creating a board', async () => {
    const dbAddKanbanBoard = vi.fn().mockResolvedValue({ id: 'new-board' })
    render(<KanbanBoard {...defaultProps({ dbAddKanbanBoard })} />)

    // Find and click "Nouveau board" button
    const newBoardBtn = screen.getByText(/Nouveau board/i)
    fireEvent.click(newBoardBtn)

    // Fill in board name
    const input = screen.getByPlaceholderText(/nom du board/i)
    fireEvent.change(input, { target: { value: 'Test board' } })

    // Submit
    const createBtn = screen.getByText(/^Creer$/i)
    fireEvent.click(createBtn)

    expect(dbAddKanbanBoard).toHaveBeenCalledWith('Test board', null)
  })

  it('calls dbAddFolder when creating a kanban folder', async () => {
    const dbAddFolder = vi.fn()
    render(<KanbanBoard {...defaultProps({ dbAddFolder })} />)

    const newFolderBtn = screen.getByText(/Dossier/i)
    fireEvent.click(newFolderBtn)

    const input = screen.getByPlaceholderText(/nom du dossier/i)
    fireEvent.change(input, { target: { value: 'Mon dossier kanban' } })

    const createBtn = screen.getByText(/^Creer$/i)
    fireEvent.click(createBtn)

    expect(dbAddFolder).toHaveBeenCalledWith('Mon dossier kanban', 'kanban')
  })
})

describe('KanbanBoard - Board view', () => {
  const board = {
    id: 'board-1', name: 'Mon board', folderId: null,
    columns: [
      { id: 'todo', label: 'A faire', color: '#a78bfa' },
      { id: 'doing', label: 'En cours', color: '#60a5fa' },
      { id: 'done', label: 'Terminee', color: '#4ade80' },
    ],
    position: 0, createdAt: Date.now(), updatedAt: Date.now(),
  }

  it('shows board columns after clicking a board', () => {
    render(<KanbanBoard {...defaultProps({ kanbanBoards: [board] })} />)
    fireEvent.click(screen.getByText('Mon board'))
    expect(screen.getByText('A faire')).toBeInTheDocument()
    expect(screen.getByText('En cours')).toBeInTheDocument()
    expect(screen.getByText('Terminee')).toBeInTheDocument()
  })

  it('shows tasks scoped to the board', () => {
    const todos = [
      { id: 't1', listId: 'list-1', text: 'Tache board', status: 'todo', priority: 'medium', onKanban: true, kanbanCol: 'todo', kanbanBoardId: 'board-1', tags: [], subtasks: [], createdAt: Date.now() },
      { id: 't2', listId: 'list-1', text: 'Tache autre', status: 'todo', priority: 'medium', onKanban: true, kanbanCol: 'todo', kanbanBoardId: 'board-other', tags: [], subtasks: [], createdAt: Date.now() },
    ]
    render(<KanbanBoard {...defaultProps({ kanbanBoards: [board], allTodos: todos })} />)
    fireEvent.click(screen.getByText('Mon board'))
    expect(screen.getByText('Tache board')).toBeInTheDocument()
    expect(screen.queryByText('Tache autre')).not.toBeInTheDocument()
  })

  it('has a back button to return to browser', () => {
    render(<KanbanBoard {...defaultProps({ kanbanBoards: [board] })} />)
    fireEvent.click(screen.getByText('Mon board'))
    // Should have a back/return element
    const backBtn = screen.getByText(/Kanban|Boards|Retour/i)
    expect(backBtn).toBeInTheDocument()
  })
})
