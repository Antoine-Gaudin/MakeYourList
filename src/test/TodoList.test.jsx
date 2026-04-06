import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TodoList from '../components/TodoList'

vi.mock('../contexts/ProjectContext', () => ({
  useProject: () => ({ myRole: 'owner', members: [], activeProject: { id: 'p1' } }),
}))

const defaultProps = (overrides = {}) => ({
  lists: [{ id: 'list-1', name: 'Ma liste', folderId: null }],
  setLists: vi.fn(),
  allTodos: [],
  setAllTodos: vi.fn(),
  todoFolders: [],
  setTodoFolders: vi.fn(),
  notes: [],
  logActivity: vi.fn(),
  showToast: vi.fn(),
  dbAddList: vi.fn(),
  dbUpdateList: vi.fn(),
  dbDeleteList: vi.fn(),
  dbAddTodo: vi.fn(),
  dbUpdateTodo: vi.fn(),
  dbDeleteTodo: vi.fn(),
  dbAddSubtask: vi.fn(),
  dbUpdateSubtask: vi.fn(),
  dbDeleteSubtask: vi.fn(),
  dbAddFolder: vi.fn(),
  dbDeleteFolder: vi.fn(),
  ...overrides,
})

describe('TodoList', () => {
  it('renders with a list name', () => {
    render(<TodoList {...defaultProps()} />)
    expect(screen.getByText('Ma liste')).toBeInTheDocument()
  })

  it('shows todo count in list card', () => {
    const allTodos = [{
      id: 't1', listId: 'list-1', text: 'Faire les courses',
      status: 'todo', priority: 'medium', tags: [], subtasks: [],
      starred: false, createdAt: Date.now(),
    }]
    const { container } = render(<TodoList {...defaultProps({ allTodos })} />)
    // The list card should show 0/1 (0 done out of 1 total)
    expect(container.textContent).toContain('0/1')
  })

  it('displays todo folders', () => {
    const todoFolders = [{ id: 'f1', name: 'Dossier travail' }]
    render(<TodoList {...defaultProps({ todoFolders })} />)
    expect(screen.getByText('Dossier travail')).toBeInTheDocument()
  })

  it('renders multiple lists', () => {
    const lists = [
      { id: 'list-1', name: 'Courses', folderId: null },
      { id: 'list-2', name: 'Travail', folderId: null },
    ]
    render(<TodoList {...defaultProps({ lists })} />)
    expect(screen.getByText('Courses')).toBeInTheDocument()
    expect(screen.getByText('Travail')).toBeInTheDocument()
  })
})
