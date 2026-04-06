// ====== Shared constants — single source of truth ======

export const PRIORITIES = [
  { value: 'low', label: 'Basse', color: '#4ade80' },
  { value: 'medium', label: 'Moyenne', color: '#facc15' },
  { value: 'high', label: 'Haute', color: '#f87171' },
]

export const TAG_COLORS = [
  { name: 'Travail', color: '#60a5fa' },
  { name: 'Personnel', color: '#4ade80' },
  { name: 'Urgent', color: '#f87171' },
  { name: 'Idee', color: '#c084fc' },
  { name: 'Achat', color: '#facc15' },
  { name: 'Sante', color: '#2dd4bf' },
]

export const PLAN_LIMITS = {
  free:    { projects: 1, lists: 3, kanbanBoards: 1, members: 1, storageMB: 50, habits: false, expenses: false, api: false, export: false },
  student: { projects: 5, lists: 15, kanbanBoards: 5, members: 3, storageMB: 500, habits: false, expenses: false, api: true, export: false },
  pro:     { projects: Infinity, lists: Infinity, kanbanBoards: Infinity, members: Infinity, storageMB: 5000, habits: false, expenses: false, api: true, export: true },
}

export const PRICE_IDS = {
  student: 'price_1TIy8w2NBssd1kDTSBU76ycs',
  pro: 'price_1TIyCM2NBssd1kDTb0U8jQjQ',
}
