import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Notes from '../components/Notes'
import TodoList from '../components/TodoList'

vi.mock('../contexts/ProjectContext', () => ({
  useProject: () => ({ myRole: 'owner', members: [], activeProject: { id: 'p1' } }),
}))

vi.mock('../contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ limits: { export: true }, isFree: false, isPro: true }),
}))

// ========== HELPERS ==========

/** Double-click on the note card (not the title span which triggers rename) */
const openNoteEditor = () => {
  // The note card has a FileText icon inside a div — dblClick on the icon area
  const noteCard = screen.getByText('Ma note test').closest('[data-lasso-item]')
  fireEvent.dblClick(noteCard.querySelector('svg'))
}

const mockNote = (overrides = {}) => ({
  id: 'note-1',
  title: 'Ma note test',
  content: '# Hello',
  color: '#8b5cf6',
  folder: 'all',
  pinned: false,
  starred: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

const mockAttachment = (overrides = {}) => ({
  id: 'att-1',
  itemType: 'note',
  itemId: 'note-1',
  fileName: 'document.pdf',
  fileSize: 1024 * 500,
  fileType: 'application/pdf',
  storagePath: 'p1/note/note-1/123_document.pdf',
  createdBy: 'user-1',
  createdAt: Date.now(),
  ...overrides,
})

const mockTaskAttachment = (overrides = {}) => ({
  id: 'att-2',
  itemType: 'task',
  itemId: 't1',
  fileName: 'screenshot.png',
  fileSize: 2048 * 1024,
  fileType: 'image/png',
  storagePath: 'p1/task/t1/123_screenshot.png',
  createdBy: 'user-1',
  createdAt: Date.now(),
  ...overrides,
})

const defaultNoteProps = (overrides = {}) => ({
  notes: [mockNote()],
  setNotes: vi.fn(),
  folders: [{ id: 'all', name: 'Toutes les notes' }],
  setFolders: vi.fn(),
  lists: [{ id: 'list-1', name: 'Ma liste' }],
  allTodos: [],
  setAllTodos: vi.fn(),
  setLists: vi.fn(),
  logActivity: vi.fn(),
  dbAddNote: vi.fn(),
  dbUpdateNote: vi.fn(),
  dbDeleteNote: vi.fn(),
  dbAddFolder: vi.fn(),
  dbDeleteFolder: vi.fn(),
  attachments: [],
  uploadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  getAttachmentUrl: vi.fn((path) => `https://storage.test/${path}`),
  ...overrides,
})

const defaultTodoProps = (overrides = {}) => ({
  lists: [{ id: 'list-1', name: 'Ma liste', folderId: null }],
  setLists: vi.fn(),
  allTodos: [{
    id: 't1', listId: 'list-1', text: 'Ma tache',
    status: 'todo', priority: 'medium', tags: [], subtasks: [],
    starred: false, createdAt: Date.now(), notes: '',
    dueDate: null, linkedNoteId: null,
  }],
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
  attachments: [],
  uploadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  getAttachmentUrl: vi.fn((path) => `https://storage.test/${path}`),
  ...overrides,
})

describe('Notes - Attachments', () => {
  it('shows paperclip button with count 0 when no attachments in editor', () => {
    render(<Notes {...defaultNoteProps()} />)
    openNoteEditor()
    expect(screen.getByTitle(/Pièces jointes \(0\)/)).toBeInTheDocument()
  })

  it('shows hidden file input for attachment upload', () => {
    render(<Notes {...defaultNoteProps()} />)
    openNoteEditor()
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
  })

  it('displays attachments in banner when present', () => {
    const attachments = [mockAttachment()]
    render(<Notes {...defaultNoteProps({ attachments })} />)
    openNoteEditor()
    expect(screen.getByText('document.pdf')).toBeInTheDocument()
    expect(screen.getByTitle(/Pièces jointes \(1\)/)).toBeInTheDocument()
  })

  it('displays multiple attachments', () => {
    const attachments = [
      mockAttachment(),
      mockAttachment({ id: 'att-2', fileName: 'image.png', fileType: 'image/png', fileSize: 1024 }),
    ]
    render(<Notes {...defaultNoteProps({ attachments })} />)
    openNoteEditor()
    expect(screen.getByText('document.pdf')).toBeInTheDocument()
    expect(screen.getByText('image.png')).toBeInTheDocument()
    expect(screen.getByTitle(/Pièces jointes \(2\)/)).toBeInTheDocument()
  })

  it('renders download link with correct attributes', () => {
    const getAttachmentUrl = vi.fn(() => 'https://storage.test/file.pdf')
    const attachments = [mockAttachment()]
    render(<Notes {...defaultNoteProps({ attachments, getAttachmentUrl })} />)
    openNoteEditor()
    const link = screen.getByText('document.pdf')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('calls deleteAttachment when clicking delete button', () => {
    const deleteAttachment = vi.fn()
    const attachments = [mockAttachment()]
    render(<Notes {...defaultNoteProps({ attachments, deleteAttachment })} />)
    openNoteEditor()
    const deleteBtn = screen.getByTitle('Supprimer')
    fireEvent.click(deleteBtn)
    expect(deleteAttachment).toHaveBeenCalledWith('att-1', 'p1/note/note-1/123_document.pdf')
  })

  it('calls uploadAttachment when file is selected', async () => {
    const uploadAttachment = vi.fn().mockResolvedValue({ id: 'new-att' })
    render(<Notes {...defaultNoteProps({ uploadAttachment })} />)
    openNoteEditor()

    const fileInput = document.querySelector('input[type="file"]')
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(uploadAttachment).toHaveBeenCalledWith('note', 'note-1', file)
    })
  })

  it('logs activity only on successful upload', async () => {
    const logActivity = vi.fn()
    const uploadAttachment = vi.fn().mockResolvedValue({ error: 'Echec upload' })
    render(<Notes {...defaultNoteProps({ uploadAttachment, logActivity })} />)
    openNoteEditor()

    const fileInput = document.querySelector('input[type="file"]')
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(uploadAttachment).toHaveBeenCalled()
    })
    expect(logActivity).not.toHaveBeenCalledWith('attachment_added', expect.any(String))
  })

  it('does not show attachments from other notes', () => {
    const attachments = [mockAttachment({ itemId: 'note-999' })]
    render(<Notes {...defaultNoteProps({ attachments })} />)
    openNoteEditor()
    expect(screen.getByTitle(/Pièces jointes \(0\)/)).toBeInTheDocument()
    expect(screen.queryByText('document.pdf')).not.toBeInTheDocument()
  })
})

/** Open a list by double-clicking the card icon (not the title which triggers rename) */
const openListByDblClick = () => {
  const listCard = screen.getByText('Ma liste').closest('[data-lasso-item]')
  fireEvent.dblClick(listCard.querySelector('svg'))
}

/** Open task detail by double-clicking the task card */
const openTaskByDblClick = () => {
  const taskCard = screen.getByText('Ma tache').closest('[data-task-card]')
  fireEvent.dblClick(taskCard)
}

describe('TodoList - Attachments', () => {
  it('shows attachment section in task detail', () => {
    render(<TodoList {...defaultTodoProps()} />)
    openListByDblClick()
    openTaskByDblClick()
    expect(screen.getByText(/Pièces jointes/)).toBeInTheDocument()
  })

  it('shows "Ajouter un fichier" button in task detail', () => {
    render(<TodoList {...defaultTodoProps()} />)
    openListByDblClick()
    openTaskByDblClick()
    expect(screen.getByText('Ajouter un fichier')).toBeInTheDocument()
  })

  it('displays task attachments', () => {
    const attachments = [mockTaskAttachment()]
    render(<TodoList {...defaultTodoProps({ attachments })} />)
    openListByDblClick()
    openTaskByDblClick()
    expect(screen.getByText('screenshot.png')).toBeInTheDocument()
    expect(screen.getByText('2.0 Mo')).toBeInTheDocument()
  })

  it('does not show attachments from other tasks', () => {
    const attachments = [mockTaskAttachment({ itemId: 'other-task' })]
    render(<TodoList {...defaultTodoProps({ attachments })} />)
    openListByDblClick()
    openTaskByDblClick()
    expect(screen.queryByText('screenshot.png')).not.toBeInTheDocument()
  })

  it('calls uploadAttachment when file is selected in task detail', async () => {
    const uploadAttachment = vi.fn().mockResolvedValue({ id: 'new-att' })
    render(<TodoList {...defaultTodoProps({ uploadAttachment })} />)
    openListByDblClick()
    openTaskByDblClick()

    const fileInput = document.querySelector('input[type="file"]')
    const file = new File(['data'], 'rapport.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(uploadAttachment).toHaveBeenCalledWith('task', 't1', file)
    })
  })

  it('calls deleteAttachment when clicking delete on task attachment', () => {
    const deleteAttachment = vi.fn()
    const attachments = [mockTaskAttachment()]
    render(<TodoList {...defaultTodoProps({ attachments, deleteAttachment })} />)
    openListByDblClick()
    openTaskByDblClick()
    const attRow = screen.getByText('screenshot.png').closest('div')
    const deleteBtn = attRow.querySelector('button')
    fireEvent.click(deleteBtn)
    expect(deleteAttachment).toHaveBeenCalledWith('att-2', 'p1/task/t1/123_screenshot.png')
  })
})

describe('Attachments - formatFileSize', () => {
  it('shows correct size for various file sizes in notes', () => {
    const attachments = [
      mockAttachment({ id: 'a1', fileName: 'small.txt', fileSize: 512 }),
      mockAttachment({ id: 'a2', fileName: 'medium.txt', fileSize: 1024 * 100 }),
      mockAttachment({ id: 'a3', fileName: 'large.txt', fileSize: 1024 * 1024 * 3.5 }),
    ]
    render(<Notes {...defaultNoteProps({ attachments })} />)
    openNoteEditor()
    expect(screen.getByText('512 o')).toBeInTheDocument()
    expect(screen.getByText('100.0 Ko')).toBeInTheDocument()
    expect(screen.getByText('3.5 Mo')).toBeInTheDocument()
  })
})
