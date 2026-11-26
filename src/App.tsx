import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  BarChart3,
  Check,
  Download,
  FileDown,
  Pencil,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type FilterColor = 'blue' | 'amber' | 'emerald' | 'rose' | 'violet' | 'sky';
type SortMode = 'priority' | 'added' | 'alpha' | 'due';
type ImportMode = 'merge' | 'replace';
type PriorityKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
type ThemeKey = 'midnight' | 'slate' | 'zinc' | 'neutral' | 'stone' | 'emerald';

interface TaskItem {
  id: string;
  raw: string;
}

interface FilterButtonConfig {
  id: string;
  label: string;
  query: string;
  color: FilterColor;
  visible: boolean;
}

interface ParsedTodo {
  raw: string;
  completed: boolean;
  completionDate: string | null;
  priority: string | null;
  creationDate: string | null;
  projects: string[];
  contexts: string[];
  meta: Record<string, string>;
  due: string | null;
  content: string;
}

interface ThemeConfig {
  label: string;
  bgCanvas: string;
  bgSurface: string;
  bgElevated: string;
  bgHover: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentFg: string;
}

const STORAGE_KEYS = {
  TASKS: 'todotxt_offline_tasks_v1',
  FILTERS: 'todotxt_offline_filters_v1',
  SETTINGS: 'todotxt_offline_settings_v1',
  INIT: 'todotxt_offline_init_v1',
};

const PRIORITIES: PriorityKey[] = ['A', 'B', 'C', 'D', 'E', 'F'];

const DEFAULT_FILTERS: FilterButtonConfig[] = [
  { id: 'f_all', label: 'All', query: '', color: 'blue', visible: true },
  { id: 'f_open', label: 'Open', query: 'is:open', color: 'sky', visible: true },
  { id: 'f_p1', label: 'P1', query: '(A-B) is:open', color: 'amber', visible: true },
  { id: 'f_p2', label: 'P2', query: '(C-D) is:open', color: 'sky', visible: true },
  { id: 'f_p3', label: 'P3', query: '(E-F) is:open', color: 'violet', visible: true },
  { id: 'f_done', label: 'Done', query: 'is:done', color: 'emerald', visible: true },
];

const DEFAULT_PRIORITY_COLORS: Record<PriorityKey, string> = {
  A: '#eab308',
  B: '#ef4444',
  C: '#3b82f6',
  D: '#22c55e',
  E: '#a855f7',
  F: '#06b6d4',
};

const DEFAULT_TEXT_COLORS: Record<PriorityKey, string> = {
  A: '#fde047',
  B: '#fca5a5',
  C: '#93c5fd',
  D: '#86efac',
  E: '#d8b4fe',
  F: '#67e8f9',
};

const THEMES: Record<ThemeKey, ThemeConfig> = {
  midnight: {
    label: 'Midnight',
    bgCanvas: '#0b0d10',
    bgSurface: '#12151b',
    bgElevated: '#181c24',
    bgHover: '#1d222c',
    borderSubtle: '#232834',
    borderStrong: '#323949',
    textPrimary: '#e6e9ef',
    textSecondary: '#8c95a6',
    textMuted: '#5a6272',
    accent: '#3b82f6',
    accentHover: '#2563eb',
    accentSoft: 'rgba(59, 130, 246, 0.14)',
    accentFg: '#ffffff',
  },
  slate: {
    label: 'Slate',
    bgCanvas: '#090e1a',
    bgSurface: '#0f172a',
    bgElevated: '#162033',
    bgHover: '#1e293b',
    borderSubtle: '#1e293b',
    borderStrong: '#334155',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSoft: 'rgba(14, 165, 233, 0.16)',
    accentFg: '#ffffff',
  },
  zinc: {
    label: 'Zinc',
    bgCanvas: '#09090b',
    bgSurface: '#131316',
    bgElevated: '#1b1b1f',
    bgHover: '#232329',
    borderSubtle: '#27272a',
    borderStrong: '#3f3f46',
    textPrimary: '#f4f4f5',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    accent: '#6366f1',
    accentHover: '#4f46e5',
    accentSoft: 'rgba(99, 102, 241, 0.16)',
    accentFg: '#ffffff',
  },
  neutral: {
    label: 'Neutral',
    bgCanvas: '#0a0a0a',
    bgSurface: '#141414',
    bgElevated: '#1c1c1c',
    bgHover: '#242424',
    borderSubtle: '#262626',
    borderStrong: '#404040',
    textPrimary: '#f5f5f5',
    textSecondary: '#a3a3a3',
    textMuted: '#737373',
    accent: '#d4d4d4',
    accentHover: '#e5e5e5',
    accentSoft: 'rgba(212, 212, 212, 0.14)',
    accentFg: '#0a0a0a',
  },
  stone: {
    label: 'Stone',
    bgCanvas: '#0c0a09',
    bgSurface: '#161311',
    bgElevated: '#1f1b18',
    bgHover: '#292524',
    borderSubtle: '#292524',
    borderStrong: '#44403c',
    textPrimary: '#f5f5f4',
    textSecondary: '#a8a29e',
    textMuted: '#78716c',
    accent: '#f59e0b',
    accentHover: '#d97706',
    accentSoft: 'rgba(245, 158, 11, 0.16)',
    accentFg: '#0c0a09',
  },
  emerald: {
    label: 'Forest',
    bgCanvas: '#070f0c',
    bgSurface: '#0d1914',
    bgElevated: '#13241d',
    bgHover: '#193027',
    borderSubtle: '#1d352b',
    borderStrong: '#2c4f41',
    textPrimary: '#ecfdf5',
    textSecondary: '#86efac',
    textMuted: '#4d7c66',
    accent: '#10b981',
    accentHover: '#059669',
    accentSoft: 'rgba(16, 185, 129, 0.16)',
    accentFg: '#070f0c',
  },
};

const SAMPLE_TASKS: string[] = [
  '(A) 2026-11-24 Finalize quarterly budget review +Finance @office due:2026-11-26',
  '(A) 2026-11-24 Call clinic to confirm Friday appointment +Health @phone',
  '(B) 2026-11-23 Draft release notes for offline client +Work @laptop',
  '(B) 2026-11-22 Buy coffee beans and oat milk +Home @errands',
  '(C) 2026-11-21 Archive old project folders +Maintenance @computer',
  '(C) 2026-11-20 Review pull requests for client module +Work @laptop',
  '(D) 2026-11-19 Clean desk and organize cables +Home @office',
  '(D) 2026-11-18 Backup photo library to external drive +Maintenance @home',
  '(E) 2026-11-18 Organize digital receipts folder +Finance @computer',
  '(F) 2026-11-17 Read backup verification checklist +Ops @reading',
  'x 2026-11-24 2026-11-21 Ship offline backup validator +Work @laptop',
  'x 2026-11-23 2026-11-19 Pay monthly utility bills +Finance @computer',
  'x 2026-11-22 2026-11-15 Sync local storage export test +Work @laptop',
  'x 2026-11-20 2026-11-17 Clean inbox and archive receipts +Home @computer',
];

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function uid(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function parseTodoLine(raw: string): ParsedTodo {
  const text = String(raw || '').trim();
  let remaining = text;
  let completed = false;
  let completionDate: string | null = null;
  let priority: string | null = null;
  let creationDate: string | null = null;

  if (/^x(\s|$)/.test(remaining)) {
    completed = true;
    remaining = remaining.slice(1).trim();
    const compDateMatch = remaining.match(/^(\d{4}-\d{2}-\d{2})(?:\s+|$)/);
    if (compDateMatch) {
      completionDate = compDateMatch[1];
      remaining = remaining.slice(compDateMatch[0].length).trim();
    }
  }

  const priMatch = remaining.match(/^\(([A-Z])\)\s+/);
  if (priMatch) {
    priority = priMatch[1];
    remaining = remaining.slice(priMatch[0].length).trim();
  }

  const createMatch = remaining.match(/^(\d{4}-\d{2}-\d{2})(?:\s+|$)/);
  if (createMatch) {
    creationDate = createMatch[1];
    remaining = remaining.slice(createMatch[0].length).trim();
  }

  const projects: string[] = [];
  const contexts: string[] = [];
  const meta: Record<string, string> = {};
  const contentParts: string[] = [];
  const tokens = remaining ? remaining.split(/\s+/) : [];

  for (const tok of tokens) {
    if (/^\+\S+/.test(tok)) {
      const p = tok.slice(1);
      if (!projects.some((existing) => existing.toLowerCase() === p.toLowerCase())) {
        projects.push(p);
      }
    } else if (/^@\S+/.test(tok)) {
      const c = tok.slice(1);
      if (!contexts.some((existing) => existing.toLowerCase() === c.toLowerCase())) {
        contexts.push(c);
      }
    } else if (/^[a-zA-Z][a-zA-Z0-9_-]*:[^\s]+$/.test(tok) && !/^https?:\/\//i.test(tok)) {
      const colonIdx = tok.indexOf(':');
      const k = tok.slice(0, colonIdx).toLowerCase();
      const v = tok.slice(colonIdx + 1);
      meta[k] = v;
    } else {
      contentParts.push(tok);
    }
  }

  const content =
    contentParts.length > 0
      ? contentParts.join(' ').trim()
      : projects.length > 0 || contexts.length > 0
        ? ''
        : remaining || text;

  return {
    raw: text,
    completed,
    completionDate,
    priority,
    creationDate,
    projects,
    contexts,
    meta,
    due: meta.due || null,
    content,
  };
}

function applyPriorityPrefix(raw: string, targetPriority: PriorityKey | null): string {
  const text = String(raw || '').trim();
  let prefix = '';
  let rest = text;

  if (/^x(\s|$)/.test(rest)) {
    const doneMatch = rest.match(/^(x(?:\s+\d{4}-\d{2}-\d{2})?)\s*(.*)$/);
    if (doneMatch) {
      prefix = `${doneMatch[1]} `;
      rest = doneMatch[2] || '';
    }
  }

  const existingPriMatch = rest.match(/^\(([A-Z])\)\s*(.*)$/);
  let existingPri: string | null = null;
  if (existingPriMatch) {
    existingPri = existingPriMatch[1];
    rest = existingPriMatch[2] || '';
  }

  if (!targetPriority || existingPri === targetPriority) {
    return `${prefix}${rest}`.trim();
  }
  return `${prefix}(${targetPriority}) ${rest}`.trim();
}

function toggleRawCompletion(raw: string): string {
  const trimmed = String(raw || '').trim();
  const today = todayISO();
  if (/^x(\s|$)/.test(trimmed)) {
    const rest = trimmed.slice(1).trim().replace(/^\d{4}-\d{2}-\d{2}\s*/, '').trim();
    return rest;
  }
  return `x ${today} ${trimmed}`;
}

function matchesSingleTerm(parsed: ParsedTodo, rawTerm: string): boolean {
  if (!rawTerm) return true;
  let negate = false;
  let term = rawTerm;
  if (term.startsWith('-') && term.length > 1) {
    negate = true;
    term = term.slice(1);
  }

  const lower = term.toLowerCase();
  let result = false;

  if (lower === 'is:open' || lower === 'is:active') {
    result = !parsed.completed;
  } else if (lower === 'is:done' || lower === 'is:completed') {
    result = parsed.completed;
  } else if (/^\(([A-Z])\)$/i.test(term)) {
    result = parsed.priority === term.slice(1, 2).toUpperCase();
  } else if (/^\(([A-Z])-([A-Z])\)$/i.test(term)) {
    const m = term.match(/^\(([A-Z])-([A-Z])\)$/i);
    if (m) {
      const startC = m[1].toUpperCase().charCodeAt(0);
      const endC = m[2].toUpperCase().charCodeAt(0);
      const pCode = parsed.priority ? parsed.priority.charCodeAt(0) : -1;
      result = pCode >= Math.min(startC, endC) && pCode <= Math.max(startC, endC);
    }
  } else if (lower.startsWith('priority:')) {
    result = parsed.priority === lower.slice(9).toUpperCase();
  } else if (lower === 'due:today') {
    result = parsed.due === todayISO();
  } else if (lower === 'due:overdue') {
    result = Boolean(parsed.due && !parsed.completed && parsed.due < todayISO());
  } else if (lower === 'has:due') {
    result = Boolean(parsed.due);
  } else if (term.startsWith('+')) {
    const proj = term.slice(1).toLowerCase();
    result = parsed.projects.some((p) => p.toLowerCase() === proj || p.toLowerCase().includes(proj));
  } else if (term.startsWith('@')) {
    const ctx = term.slice(1).toLowerCase();
    result = parsed.contexts.some((c) => c.toLowerCase() === ctx || c.toLowerCase().includes(ctx));
  } else {
    result = parsed.raw.toLowerCase().includes(lower);
  }

  return negate ? !result : result;
}

function matchesQuery(parsed: ParsedTodo, query: string): boolean {
  const q = String(query || '').trim();
  if (!q) return true;
  const orGroups = q.split(/\s+OR\s+/);
  for (const group of orGroups) {
    const terms = group.trim().split(/\s+/);
    if (terms.every((t) => matchesSingleTerm(parsed, t))) {
      return true;
    }
  }
  return false;
}

function migrateFiltersIfNeeded(filters: FilterButtonConfig[]): FilterButtonConfig[] {
  const hasLegacyHigh = filters.some((f) => f.id === 'f_high');
  const hasP1 = filters.some((f) => f.id === 'f_p1');
  if (!hasLegacyHigh || hasP1) return filters;

  const migrated: FilterButtonConfig[] = [];
  for (const f of filters) {
    if (f.id === 'f_high') {
      migrated.push({ id: 'f_p1', label: 'P1', query: '(A-B) is:open', color: 'amber', visible: true });
      migrated.push({ id: 'f_p2', label: 'P2', query: '(C-D) is:open', color: 'sky', visible: true });
      migrated.push({ id: 'f_p3', label: 'P3', query: '(E-F) is:open', color: 'violet', visible: true });
    } else {
      migrated.push(f);
    }
  }
  return migrated;
}

function buildPageRange(current: number, total: number): Array<number | '...'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }
  const pages: Array<number | '...'> = [1];
  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);
  if (start > 2) pages.push('...');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

function downloadBlob(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const ACTIVE_COLOR_STYLES: Record<FilterColor, string> = {
  blue: 'bg-blue-500/15 border-blue-500 text-[var(--text-primary)]',
  amber: 'bg-amber-500/15 border-amber-500 text-[var(--text-primary)]',
  emerald: 'bg-emerald-500/15 border-emerald-500 text-[var(--text-primary)]',
  rose: 'bg-rose-500/15 border-rose-500 text-[var(--text-primary)]',
  violet: 'bg-violet-500/15 border-violet-500 text-[var(--text-primary)]',
  sky: 'bg-sky-500/15 border-sky-500 text-[var(--text-primary)]',
};

export default function App() {
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const isInit = localStorage.getItem(STORAGE_KEYS.INIT);
      const rawTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (!isInit && !rawTasks) {
        const seeded = SAMPLE_TASKS.map((line) => ({ id: uid(), raw: line }));
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(seeded));
        localStorage.setItem(STORAGE_KEYS.INIT, '1');
        return seeded;
      }
      if (rawTasks) {
        const parsed = JSON.parse(rawTasks);
        if (Array.isArray(parsed)) {
          return parsed.filter((t) => t && typeof t.raw === 'string');
        }
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [filters, setFilters] = useState<FilterButtonConfig[]>(() => {
    try {
      const rawFilters = localStorage.getItem(STORAGE_KEYS.FILTERS);
      if (rawFilters) {
        const parsed = JSON.parse(rawFilters);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return migrateFiltersIfNeeded(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_FILTERS;
  });

  const [activeFilterId, setActiveFilterId] = useState<string>(() => {
    try {
      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed.activeFilterId === 'f_high') return 'f_p1';
        if (parsed.activeFilterId) return parsed.activeFilterId;
      }
    } catch {
      // ignore
    }
    return 'f_all';
  });

  const [sortBy, setSortBy] = useState<SortMode>(() => {
    try {
      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed.sortBy) return parsed.sortBy;
      }
    } catch {
      // ignore
    }
    return 'priority';
  });

  const [pageSize, setPageSize] = useState<number>(() => {
    try {
      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (typeof parsed.pageSize === 'number' && parsed.pageSize >= 1) {
          return Math.min(500, Math.floor(parsed.pageSize));
        }
      }
    } catch {
      // ignore
    }
    return 10;
  });

  const [theme, setTheme] = useState<ThemeKey>(() => {
    try {
      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed.theme && THEMES[parsed.theme as ThemeKey]) {
          return parsed.theme as ThemeKey;
        }
      }
    } catch {
      // ignore
    }
    return 'midnight';
  });

  const [boldPriorityA, setBoldPriorityA] = useState<boolean>(() => {
    try {
      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (typeof parsed.boldPriorityA === 'boolean') return parsed.boldPriorityA;
      }
    } catch {
      // ignore
    }
    return true;
  });

  const [colorizeCheckboxes, setColorizeCheckboxes] = useState<boolean>(() => {
    try {
      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (typeof parsed.colorizeCheckboxes === 'boolean') return parsed.colorizeCheckboxes;
      }
    } catch {
      // ignore
    }
    return true;
  });

  const [priorityColors, setPriorityColors] = useState<Record<PriorityKey, string>>(() => {
    try {
      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed.priorityColors && typeof parsed.priorityColors === 'object') {
          return { ...DEFAULT_PRIORITY_COLORS, ...parsed.priorityColors };
        }
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_PRIORITY_COLORS };
  });

  const [colorizeText, setColorizeText] = useState<boolean>(() => {
    try {
      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (typeof parsed.colorizeText === 'boolean') return parsed.colorizeText;
      }
    } catch {
      // ignore
    }
    return true;
  });

  const [priorityTextColors, setPriorityTextColors] = useState<Record<PriorityKey, string>>(() => {
    try {
      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed.priorityTextColors && typeof parsed.priorityTextColors === 'object') {
          return { ...DEFAULT_TEXT_COLORS, ...parsed.priorityTextColors };
        }
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_TEXT_COLORS };
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [newTaskText, setNewTaskText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskDraft, setEditingTaskDraft] = useState('');

  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);

  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [filterLabelInput, setFilterLabelInput] = useState('');
  const [filterQueryInput, setFilterQueryInput] = useState('');
  const [filterColorInput, setFilterColorInput] = useState<FilterColor>('blue');

  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [restoreSettingsOnImport, setRestoreSettingsOnImport] = useState(true);
  const [pasteImportText, setPasteImportText] = useState('');

  const [toast, setToast] = useState<{ message: string; canUndo: boolean } | null>(null);
  const undoSnapshotRef = useRef<TaskItem[] | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const addInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editWrapRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const activeTheme = THEMES[theme] || THEMES.midnight;

  // Apply active theme CSS variables
  useEffect(() => {
    const t = THEMES[theme] || THEMES.midnight;
    const root = document.documentElement.style;
    root.setProperty('--bg-canvas', t.bgCanvas);
    root.setProperty('--bg-surface', t.bgSurface);
    root.setProperty('--bg-elevated', t.bgElevated);
    root.setProperty('--bg-hover', t.bgHover);
    root.setProperty('--border-subtle', t.borderSubtle);
    root.setProperty('--border-strong', t.borderStrong);
    root.setProperty('--text-primary', t.textPrimary);
    root.setProperty('--text-secondary', t.textSecondary);
    root.setProperty('--text-muted', t.textMuted);
    root.setProperty('--accent', t.accent);
    root.setProperty('--accent-hover', t.accentHover);
    root.setProperty('--accent-soft', t.accentSoft);
    root.setProperty('--accent-fg', t.accentFg);
    document.body.style.backgroundColor = t.bgCanvas;
    document.body.style.color = t.textPrimary;
  }, [theme]);

  // Sync persistence to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filters));
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify({
          activeFilterId,
          sortBy,
          pageSize,
          theme,
          boldPriorityA,
          colorizeCheckboxes,
          priorityColors,
          colorizeText,
          priorityTextColors,
        })
      );
      localStorage.setItem(STORAGE_KEYS.INIT, '1');
    } catch {
      // ignore storage quota errors
    }
  }, [
    tasks,
    filters,
    activeFilterId,
    sortBy,
    pageSize,
    theme,
    boldPriorityA,
    colorizeCheckboxes,
    priorityColors,
    colorizeText,
    priorityTextColors,
  ]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape') {
        const hadOverlayOrEdit =
          analyticsModalOpen || filtersModalOpen || settingsModalOpen || backupModalOpen || editingTaskId !== null;
        setAnalyticsModalOpen(false);
        setFiltersModalOpen(false);
        setSettingsModalOpen(false);
        setBackupModalOpen(false);
        setEditingTaskId(null);
        if (!hadOverlayOrEdit) {
          setSelectedTag(null);
        }
        return;
      }

      if (!isTyping && e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (!isTyping && e.key === 'n') {
        e.preventDefault();
        addInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const showToast = (message: string, canUndo = false) => {
    setToast({ message, canUndo });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      undoSnapshotRef.current = null;
    }, 4000);
  };

  const parsedTasks = useMemo(
    () => tasks.map((task, index) => ({ task, parsed: parseTodoLine(task.raw), index })),
    [tasks]
  );

  const visibleFilters = useMemo(
    () => filters.filter((f) => f.visible !== false),
    [filters]
  );

  const effectiveActiveFilter = useMemo(() => {
    return (
      visibleFilters.find((f) => f.id === activeFilterId) ||
      visibleFilters[0] ||
      filters[0]
    );
  }, [visibleFilters, filters, activeFilterId]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of filters) {
      let count = 0;
      for (const item of parsedTasks) {
        if (matchesQuery(item.parsed, f.query)) count++;
      }
      counts[f.id] = count;
    }
    return counts;
  }, [filters, parsedTasks]);

  const displayedTasks = useMemo(() => {
    const filterQuery = effectiveActiveFilter?.query || '';
    const search = searchQuery.trim().toLowerCase();
    const tagLower = selectedTag ? selectedTag.toLowerCase() : null;

    const matched = parsedTasks.filter(({ parsed }) => {
      if (!matchesQuery(parsed, filterQuery)) return false;
      if (tagLower) {
        if (tagLower.startsWith('+')) {
          const target = tagLower.slice(1);
          if (!parsed.projects.some((p) => p.toLowerCase() === target)) return false;
        } else if (tagLower.startsWith('@')) {
          const target = tagLower.slice(1);
          if (!parsed.contexts.some((c) => c.toLowerCase() === target)) return false;
        }
      }
      if (search && !parsed.raw.toLowerCase().includes(search)) return false;
      return true;
    });

    return [...matched].sort((a, b) => {
      if (sortBy === 'priority') {
        if (a.parsed.completed !== b.parsed.completed) {
          return a.parsed.completed ? 1 : -1;
        }
        const pa = a.parsed.priority || 'ZZ';
        const pb = b.parsed.priority || 'ZZ';
        if (pa !== pb) return pa < pb ? -1 : 1;
        return a.index - b.index;
      }
      if (sortBy === 'alpha') {
        const ta = a.parsed.content || a.parsed.raw;
        const tb = b.parsed.content || b.parsed.raw;
        return ta.localeCompare(tb);
      }
      if (sortBy === 'due') {
        if (a.parsed.completed !== b.parsed.completed) {
          return a.parsed.completed ? 1 : -1;
        }
        const da = a.parsed.due || '9999-99-99';
        const db = b.parsed.due || '9999-99-99';
        if (da !== db) return da < db ? -1 : 1;
        return a.index - b.index;
      }
      return a.index - b.index;
    });
  }, [parsedTasks, effectiveActiveFilter, searchQuery, selectedTag, sortBy]);

  const safePageSize = Math.max(1, pageSize || 10);
  const totalPages = Math.max(1, Math.ceil(displayedTasks.length / safePageSize));
  const clampedPage = Math.min(Math.max(1, currentPage), totalPages);

  useEffect(() => {
    if (currentPage !== clampedPage) {
      setCurrentPage(clampedPage);
    }
  }, [currentPage, clampedPage]);

  const paginatedTasks = useMemo(() => {
    const startIdx = (clampedPage - 1) * safePageSize;
    return displayedTasks.slice(startIdx, startIdx + safePageSize);
  }, [displayedTasks, clampedPage, safePageSize]);

  const pageRange = useMemo(
    () => buildPageRange(clampedPage, totalPages),
    [clampedPage, totalPages]
  );

  const openCount = useMemo(
    () => parsedTasks.filter((t) => !t.parsed.completed).length,
    [parsedTasks]
  );

  const completedCount = tasks.length - openCount;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Analytics datasets for Recharts
  const completionTrendData = useMemo(() => {
    const map: Record<string, { created: number; completed: number }> = {};
    for (const { parsed } of parsedTasks) {
      if (parsed.creationDate) {
        if (!map[parsed.creationDate]) map[parsed.creationDate] = { created: 0, completed: 0 };
        map[parsed.creationDate].created++;
      }
      if (parsed.completed && parsed.completionDate) {
        if (!map[parsed.completionDate]) map[parsed.completionDate] = { created: 0, completed: 0 };
        map[parsed.completionDate].completed++;
      }
    }
    let runningCompleted = 0;
    return Object.keys(map)
      .sort()
      .map((date) => {
        runningCompleted += map[date].completed;
        return {
          date: date.slice(5),
          fullDate: date,
          created: map[date].created,
          completed: map[date].completed,
          cumulativeDone: runningCompleted,
        };
      });
  }, [parsedTasks]);

  const projectDistributionData = useMemo(() => {
    const map: Record<string, { open: number; done: number }> = {};
    for (const { parsed } of parsedTasks) {
      const keys = parsed.projects.length > 0 ? parsed.projects : ['(No Project)'];
      for (const proj of keys) {
        const label = proj === '(No Project)' ? proj : `+${proj}`;
        if (!map[label]) map[label] = { open: 0, done: 0 };
        if (parsed.completed) map[label].done++;
        else map[label].open++;
      }
    }
    return Object.keys(map)
      .map((project) => ({
        project,
        open: map[project].open,
        done: map[project].done,
        total: map[project].open + map[project].done,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [parsedTasks]);

  const editingDraftPriority = useMemo(
    () => parseTodoLine(editingTaskDraft).priority,
    [editingTaskDraft]
  );

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newTaskText.trim();
    if (!raw) return;
    setTasks((prev) => [{ id: uid(), raw }, ...prev]);
    setCurrentPage(1);
    setNewTaskText('');
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, raw: toggleRawCompletion(t.raw) } : t))
    );
  };

  const handleRemoveTask = (id: string) => {
    undoSnapshotRef.current = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (editingTaskId === id) setEditingTaskId(null);
    showToast('Task removed', true);
  };

  const handleCommitEdit = (id: string) => {
    const trimmed = editingTaskDraft.trim();
    if (trimmed) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, raw: trimmed } : t)));
    }
    setEditingTaskId(null);
  };

  const handleQuickPriority = (letter: PriorityKey | null) => {
    setEditingTaskDraft((prev) => applyPriorityPrefix(prev, letter));
    editInputRef.current?.focus();
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag((prev) => (prev && prev.toLowerCase() === tag.toLowerCase() ? null : tag));
    setCurrentPage(1);
    setEditingTaskId(null);
  };

  const handleUndo = () => {
    if (undoSnapshotRef.current) {
      setTasks(undoSnapshotRef.current);
      undoSnapshotRef.current = null;
      setToast(null);
    }
  };

  const resetFilterForm = () => {
    setEditingFilterId(null);
    setFilterLabelInput('');
    setFilterQueryInput('');
    setFilterColorInput('blue');
  };

  const handleSaveFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const label = filterLabelInput.trim();
    const query = filterQueryInput.trim();
    if (!label) return;

    if (editingFilterId) {
      setFilters((prev) =>
        prev.map((f) =>
          f.id === editingFilterId ? { ...f, label, query, color: filterColorInput } : f
        )
      );
    } else {
      setFilters((prev) => [
        ...prev,
        {
          id: `f_${Date.now().toString(36)}`,
          label,
          query,
          color: filterColorInput,
          visible: true,
        },
      ]);
    }
    resetFilterForm();
  };

  const handleMoveFilterUp = (index: number) => {
    if (index <= 0) return;
    setFilters((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const buildSettingsPayload = () => ({
    activeFilterId,
    sortBy,
    pageSize,
    theme,
    boldPriorityA,
    colorizeCheckboxes,
    priorityColors,
    colorizeText,
    priorityTextColors,
  });

  const applyImportedConfig = (obj: Record<string, unknown>) => {
    if (Array.isArray(obj.filters) && obj.filters.length > 0) {
      setFilters(migrateFiltersIfNeeded(obj.filters as FilterButtonConfig[]));
    }
    const s = (obj.settings && typeof obj.settings === 'object' ? obj.settings : obj) as Record<string, unknown>;
    if (typeof s.activeFilterId === 'string') setActiveFilterId(s.activeFilterId);
    if (typeof s.sortBy === 'string') setSortBy(s.sortBy as SortMode);
    if (typeof s.pageSize === 'number' && s.pageSize >= 1) {
      setPageSize(Math.min(500, Math.floor(s.pageSize)));
    }
    if (typeof s.theme === 'string' && THEMES[s.theme as ThemeKey]) {
      setTheme(s.theme as ThemeKey);
    }
    if (typeof s.boldPriorityA === 'boolean') setBoldPriorityA(s.boldPriorityA);
    if (typeof s.colorizeCheckboxes === 'boolean') setColorizeCheckboxes(s.colorizeCheckboxes);
    if (s.priorityColors && typeof s.priorityColors === 'object') {
      setPriorityColors({ ...DEFAULT_PRIORITY_COLORS, ...(s.priorityColors as Partial<Record<PriorityKey, string>>) });
    }
    if (typeof s.colorizeText === 'boolean') setColorizeText(s.colorizeText);
    if (s.priorityTextColors && typeof s.priorityTextColors === 'object') {
      setPriorityTextColors({ ...DEFAULT_TEXT_COLORS, ...(s.priorityTextColors as Partial<Record<PriorityKey, string>>) });
    }
  };

  const handleImportLines = (lines: string[], mode: ImportMode) => {
    const clean = lines.map((l) => l.trim()).filter((l) => l.length > 0);
    if (clean.length === 0) {
      showToast('No valid task lines found.');
      return;
    }

    if (mode === 'replace') {
      setTasks(clean.map((raw) => ({ id: uid(), raw })));
    } else {
      setTasks((prev) => {
        const existing = new Set(prev.map((t) => t.raw));
        const additions: TaskItem[] = [];
        for (const raw of clean) {
          if (!existing.has(raw)) {
            additions.push({ id: uid(), raw });
            existing.add(raw);
          }
        }
        return [...prev, ...additions];
      });
    }
    setCurrentPage(1);
    showToast(`Imported ${clean.length} task(s).`);
  };

  const handleBackupPayloadImport = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('{')) {
      try {
        const obj = JSON.parse(trimmed) as Record<string, unknown>;
        const hasConfig = Boolean(
          obj.filters || obj.settings || obj.theme || obj.pageSize || obj.priorityColors || obj.priorityTextColors
        );
        if (restoreSettingsOnImport && hasConfig) {
          applyImportedConfig(obj);
        }
        if (Array.isArray(obj.tasks) && obj.tasks.length > 0) {
          const lines = obj.tasks.map((t: unknown) =>
            typeof t === 'string' ? t : (t as { raw: string }).raw
          );
          handleImportLines(lines, importMode);
          if (restoreSettingsOnImport && hasConfig) {
            showToast('Restored tasks, custom views, and settings');
          }
          return;
        }
        if (restoreSettingsOnImport && hasConfig) {
          showToast('Restored settings and custom filter views');
          return;
        }
      } catch {
        // fallback to line import
      }
    }

    handleImportLines(trimmed.split(/\r?\n/), importMode);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      handleBackupPayloadImport(text);
      setBackupModalOpen(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadStandaloneHtml = async (filename: 'TODOTXT.html' | 'TODOTXT-localfile.html') => {
    try {
      const res = await fetch(`/${filename}`);
      if (!res.ok) throw new Error('Fetch failed');
      const html = await res.text();
      downloadBlob(filename, html, 'text/html;charset=utf-8');
      showToast(`Downloaded ${filename}`);
    } catch {
      showToast(`Unable to download ${filename}`);
    }
  };

  const getCheckboxColor = (parsed: ParsedTodo): string | undefined => {
    if (!colorizeCheckboxes || !parsed.priority) return undefined;
    return priorityColors[parsed.priority as PriorityKey];
  };

  const getTaskTextColor = (parsed: ParsedTodo): string | undefined => {
    if (!colorizeText || parsed.completed || !parsed.priority) return undefined;
    return priorityTextColors[parsed.priority as PriorityKey];
  };

  return (
    <div className="min-h-full bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <div className="max-w-[1100px] mx-auto min-h-screen flex flex-col px-3 py-2.5 pb-4 gap-2">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h1 className="text-[14px] font-bold tracking-[0.02em] text-[var(--text-primary)] whitespace-nowrap shrink-0">
              TODOTXT
            </h1>
            <span className="text-[10px] font-semibold text-[var(--text-muted)] whitespace-nowrap shrink-0">
              Cache Version
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
              {displayedTasks.length} shown · {openCount} open · {tasks.length} total
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setAnalyticsModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-6 px-2 text-[11px] font-medium rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] transition-colors whitespace-nowrap shrink-0"
            >
              <BarChart3 className="w-3 h-3" />
              <span>Analytics</span>
            </button>

            <button
              type="button"
              onClick={() => {
                resetFilterForm();
                setFiltersModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 h-6 px-2 text-[11px] font-medium rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] transition-colors whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Customize Filters</span>
            </button>

            <button
              type="button"
              onClick={() => setSettingsModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-6 px-2 text-[11px] font-medium rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] transition-colors whitespace-nowrap shrink-0"
            >
              <Settings className="w-3 h-3" />
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setBackupModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-6 px-2 text-[11px] font-medium rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3 h-3" />
              <span>Backup &amp; Restore</span>
            </button>
          </div>
        </header>

        {/* Search Input (Top) */}
        <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded focus-within:border-[var(--accent)] transition-colors">
          <Search className="w-3 h-3 ml-2.5 text-[var(--text-muted)] shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search tasks, +project, @context... (/)"
            aria-label="Search tasks"
            autoComplete="off"
            className="w-full h-[30px] px-2 bg-transparent border-none text-[11px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
                searchInputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="inline-flex items-center justify-center w-5 h-5 mr-1 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Buttons & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0" role="tablist" aria-label="Task filters">
            {visibleFilters.map((f) => {
              const isActive = effectiveActiveFilter?.id === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  title={f.query ? `Rule: ${f.query}` : 'Show all tasks'}
                  onClick={() => {
                    setActiveFilterId(f.id);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 h-6 px-2 rounded text-[10px] font-medium border whitespace-nowrap transition-colors ${
                    isActive
                      ? ACTIVE_COLOR_STYLES[f.color || 'blue']
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="tabular-nums opacity-70 text-[9px]">{filterCounts[f.id] ?? 0}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {selectedTag && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTag(null);
                  setCurrentPage(1);
                }}
                title={`Clear ${selectedTag} filter`}
                className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-semibold border whitespace-nowrap transition-colors ${
                  selectedTag.startsWith('+')
                    ? 'bg-sky-500/20 border-sky-400/60 text-sky-200 hover:bg-sky-500/30'
                    : 'bg-violet-500/20 border-violet-400/60 text-violet-200 hover:bg-violet-500/30'
                }`}
              >
                <span>{selectedTag}</span>
                <X className="w-2.5 h-2.5" />
              </button>
            )}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortMode);
                setCurrentPage(1);
              }}
              aria-label="Sort tasks"
              className="h-6 px-1.5 text-[10px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded text-[var(--text-secondary)] cursor-pointer focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="priority">Sort: Priority</option>
              <option value="added">Sort: Order</option>
              <option value="alpha">Sort: A-Z</option>
              <option value="due">Sort: Due Date</option>
            </select>
          </div>
        </div>

        {/* Compact Task List (10px font-size, content-only) */}
        <main className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md overflow-hidden flex-1 flex flex-col justify-between">
          <div>
            {displayedTasks.length === 0 ? (
              <div className="py-7 px-4 text-center text-[var(--text-secondary)] text-[11px]">
                <p className="mb-2.5">
                  {tasks.length === 0
                    ? 'No tasks yet. Add one below in todo.txt format.'
                    : 'No tasks match this filter or search.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTag(null);
                    setCurrentPage(1);
                    if (filters.length > 0) {
                      setFilters((prev) =>
                        prev.map((f, idx) => (idx === 0 ? { ...f, visible: true } : f))
                      );
                      setActiveFilterId(filters[0].id);
                    }
                  }}
                  className="inline-flex items-center h-6 px-2.5 text-[11px] font-medium rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                >
                  Show All Tasks
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]" aria-label="Tasks">
                {paginatedTasks.map(({ task, parsed }) => {
                  const isEditing = editingTaskId === task.id;
                  const checkboxColor = getCheckboxColor(parsed);
                  const textColor = getTaskTextColor(parsed);
                  const isBoldA = boldPriorityA && parsed.priority === 'A';
                  return (
                    <li
                      key={task.id}
                      className={`flex gap-1.5 px-1.5 transition-colors ${
                        isEditing
                          ? 'items-start py-1 bg-[var(--bg-elevated)]'
                          : 'items-center py-0.5 min-h-[22px] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id)}
                        aria-label={parsed.completed ? 'Mark incomplete' : 'Mark complete'}
                        style={
                          checkboxColor
                            ? parsed.completed
                              ? { backgroundColor: checkboxColor, borderColor: checkboxColor }
                              : { borderColor: checkboxColor }
                            : undefined
                        }
                        className={`w-3.5 h-3.5 rounded-[3px] border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                          isEditing ? 'mt-[3px]' : ''
                        } ${
                          parsed.completed
                            ? 'bg-[#22c55e] border-[#22c55e] text-[#0b0d10]'
                            : 'border-[var(--border-strong)] bg-transparent text-transparent hover:brightness-125'
                        }`}
                      >
                        {parsed.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>

                      {isEditing ? (
                        <div ref={editWrapRef} className="flex-1 min-w-0 flex flex-col gap-1">
                          <input
                            ref={editInputRef}
                            type="text"
                            autoFocus
                            value={editingTaskDraft}
                            onChange={(e) => setEditingTaskDraft(e.target.value)}
                            onBlur={() => {
                              setTimeout(() => {
                                if (!editWrapRef.current?.contains(document.activeElement)) {
                                  handleCommitEdit(task.id);
                                }
                              }, 0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCommitEdit(task.id);
                              } else if (e.key === 'Escape') {
                                setEditingTaskId(null);
                              }
                            }}
                            aria-label="Edit raw todo.txt line"
                            className="w-full h-[22px] px-1.5 text-[10px] font-mono bg-[var(--bg-canvas)] border border-[var(--accent)] rounded-[3px] text-[var(--text-primary)] focus:outline-none"
                          />
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[9px] text-[var(--text-muted)] mr-0.5">Priority:</span>
                            {PRIORITIES.map((letter) => {
                              const isActive = editingDraftPriority === letter;
                              const color = priorityColors[letter];
                              return (
                                <button
                                  key={letter}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleQuickPriority(letter)}
                                  title={`Set or toggle priority (${letter})`}
                                  style={
                                    isActive
                                      ? { backgroundColor: color, borderColor: color, color: '#0b0d10' }
                                      : { borderColor: color, color }
                                  }
                                  className="h-[18px] px-1.5 text-[9px] font-mono font-semibold rounded-[3px] border bg-[var(--bg-canvas)] transition-colors hover:brightness-110"
                                >
                                  ({letter})
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleQuickPriority(null)}
                              title="Remove priority"
                              className="h-[18px] px-1.5 text-[9px] font-mono font-semibold rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                            >
                              None
                            </button>

                            <div className="ml-auto flex items-center gap-1">
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setEditingTaskId(null)}
                                className="h-[18px] px-1.5 text-[9px] font-medium rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleCommitEdit(task.id)}
                                className="h-[18px] px-1.5 text-[9px] font-medium rounded-[3px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)]"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingTaskId(task.id);
                            setEditingTaskDraft(task.raw);
                          }}
                          title="Click to edit task"
                          className="flex-1 min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 py-0.5 cursor-text"
                        >
                          {parsed.content && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTaskId(task.id);
                                setEditingTaskDraft(task.raw);
                              }}
                              style={textColor ? { color: textColor } : undefined}
                              className={`text-left text-[10px] leading-[1.35] tracking-[0.01em] break-words cursor-text ${
                                isBoldA ? 'font-bold' : ''
                              } ${
                                parsed.completed
                                  ? 'text-[var(--text-muted)] line-through'
                                  : 'text-[var(--text-primary)]'
                              }`}
                            >
                              {parsed.content}
                            </button>
                          )}

                          {parsed.projects.map((proj) => {
                            const tag = `+${proj}`;
                            const isTagActive =
                              selectedTag?.toLowerCase() === tag.toLowerCase();
                            return (
                              <button
                                key={`p_${proj}`}
                                type="button"
                                aria-pressed={isTagActive}
                                title={
                                  isTagActive
                                    ? `Clear ${tag} filter`
                                    : `Filter by ${tag}`
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTagClick(tag);
                                }}
                                className={`inline-flex items-center text-[9px] leading-none rounded-full px-1.5 py-[2px] border whitespace-nowrap transition-colors cursor-pointer ${
                                  isTagActive
                                    ? 'bg-sky-500/30 border-sky-400 text-sky-100 font-semibold'
                                    : 'bg-sky-500/12 border-sky-500/30 text-sky-300 font-medium hover:bg-sky-500/25 hover:border-sky-400/60'
                                } ${parsed.completed && !isTagActive ? 'opacity-60 hover:opacity-100' : ''}`}
                              >
                                {tag}
                              </button>
                            );
                          })}

                          {parsed.contexts.map((ctx) => {
                            const tag = `@${ctx}`;
                            const isTagActive =
                              selectedTag?.toLowerCase() === tag.toLowerCase();
                            return (
                              <button
                                key={`c_${ctx}`}
                                type="button"
                                aria-pressed={isTagActive}
                                title={
                                  isTagActive
                                    ? `Clear ${tag} filter`
                                    : `Filter by ${tag}`
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTagClick(tag);
                                }}
                                className={`inline-flex items-center text-[9px] leading-none rounded-full px-1.5 py-[2px] border whitespace-nowrap transition-colors cursor-pointer ${
                                  isTagActive
                                    ? 'bg-violet-500/30 border-violet-400 text-violet-100 font-semibold'
                                    : 'bg-violet-500/12 border-violet-500/30 text-violet-300 font-medium hover:bg-violet-500/25 hover:border-violet-400/60'
                                } ${parsed.completed && !isTagActive ? 'opacity-60 hover:opacity-100' : ''}`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleRemoveTask(task.id)}
                        aria-label="Remove task"
                        className={`w-5 h-[18px] rounded-[3px] inline-flex items-center justify-center text-[var(--text-muted)] hover:bg-red-500/15 hover:text-red-300 shrink-0 transition-colors ${
                          isEditing ? 'mt-[3px]' : ''
                        }`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Classic Google-Style Pagination Bar */}
          {displayedTasks.length > 0 && totalPages > 1 && (
            <nav
              aria-label="Task pages"
              className="flex flex-wrap items-center justify-center gap-0.5 px-2.5 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
            >
              <button
                type="button"
                disabled={clampedPage <= 1}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  setEditingTaskId(null);
                }}
                className="min-w-[24px] h-[22px] px-1.5 text-[11px] rounded text-[var(--accent)] hover:bg-[var(--bg-hover)] hover:underline disabled:text-[var(--text-muted)] disabled:opacity-55 disabled:no-underline"
              >
                &lt; Prev
              </button>

              {pageRange.map((item, idx) =>
                item === '...' ? (
                  <span key={`ell_${idx}`} className="text-[10px] text-[var(--text-muted)] px-1 select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    aria-label={`Page ${item}`}
                    aria-current={item === clampedPage ? 'page' : undefined}
                    onClick={() => {
                      setCurrentPage(item);
                      setEditingTaskId(null);
                    }}
                    className={`min-w-[24px] h-[22px] px-1.5 text-[11px] tabular-nums rounded inline-flex items-center justify-center transition-colors ${
                      item === clampedPage
                        ? 'text-[var(--text-primary)] font-bold bg-[var(--accent-soft)] border border-[var(--accent)] cursor-default'
                        : 'text-[var(--accent)] hover:bg-[var(--bg-hover)] hover:underline'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={clampedPage >= totalPages}
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  setEditingTaskId(null);
                }}
                className="min-w-[24px] h-[22px] px-1.5 text-[11px] rounded text-[var(--accent)] hover:bg-[var(--bg-hover)] hover:underline disabled:text-[var(--text-muted)] disabled:opacity-55 disabled:no-underline"
              >
                Next &gt;
              </button>

              <span className="text-[10px] text-[var(--text-muted)] ml-2 tabular-nums whitespace-nowrap">
                Page {clampedPage} of {totalPages}
              </span>
            </nav>
          )}
        </main>

        {/* Add Task Input (Bottom Only) */}
        <form
          onSubmit={handleAddTask}
          className="sticky bottom-2 z-10 flex items-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded focus-within:border-[var(--accent)] transition-colors shadow-lg"
        >
          <input
            ref={addInputRef}
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Add task in todo.txt format (e.g. (A) Buy milk +Home @errands due:2026-11-25) [n]"
            aria-label="New task in todo.txt format"
            autoComplete="off"
            className="w-full h-[30px] px-2.5 bg-transparent border-none text-[11px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 h-[22px] px-2 mr-1 rounded text-[10px] font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </form>
      </div>

      {/* Analytics Dashboard Modal (Recharts) */}
      {analyticsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="analytics-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAnalyticsModalOpen(false);
          }}
        >
          <div className="w-full max-w-[760px] max-h-[88vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg p-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
              <h2 id="analytics-modal-title" className="text-[13px] font-semibold">
                Task Analytics
              </h2>
              <button
                type="button"
                onClick={() => setAnalyticsModalOpen(false)}
                aria-label="Close"
                className="w-6 h-6 inline-flex items-center justify-center rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                <div className="text-[10px] text-[var(--text-muted)]">Total Tasks</div>
                <div className="text-[15px] font-bold tabular-nums mt-0.5">{tasks.length}</div>
              </div>
              <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                <div className="text-[10px] text-[var(--text-muted)]">Open</div>
                <div className="text-[15px] font-bold tabular-nums mt-0.5">{openCount}</div>
              </div>
              <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                <div className="text-[10px] text-[var(--text-muted)]">Completed</div>
                <div className="text-[15px] font-bold tabular-nums mt-0.5">{completedCount}</div>
              </div>
              <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                <div className="text-[10px] text-[var(--text-muted)]">Completion Rate</div>
                <div className="text-[15px] font-bold tabular-nums mt-0.5">{completionRate}%</div>
              </div>
            </div>

            {/* Completion Trends Over Time */}
            <div className="p-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                  Task Completion Trends Over Time
                </span>
                <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-[2px] bg-[#22c55e]" />
                    Completed
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: activeTheme.accent }} />
                    Created
                  </span>
                </div>
              </div>

              {completionTrendData.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-[var(--text-muted)]">
                  Add YYYY-MM-DD creation or completion dates to tasks to visualize trends over time.
                </div>
              ) : (
                <div className="w-full h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={completionTrendData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeTheme.accent} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={activeTheme.accent} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={activeTheme.borderSubtle} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: activeTheme.textMuted, fontSize: 10 }}
                        axisLine={{ stroke: activeTheme.borderSubtle }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: activeTheme.textMuted, fontSize: 10 }}
                        axisLine={{ stroke: activeTheme.borderSubtle }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: activeTheme.bgElevated,
                          border: `1px solid ${activeTheme.borderStrong}`,
                          borderRadius: '6px',
                          fontSize: '11px',
                          color: activeTheme.textPrimary,
                        }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                      />
                      <Area
                        type="monotone"
                        dataKey="created"
                        name="Created"
                        stroke={activeTheme.accent}
                        strokeWidth={1.75}
                        fill="url(#createdGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="completed"
                        name="Completed"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#completedGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Project Distribution */}
            <div className="p-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                  Project Distribution
                </span>
                <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: activeTheme.accent }} />
                    Open
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-[2px] bg-[#22c55e]" />
                    Done
                  </span>
                </div>
              </div>

              {projectDistributionData.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-[var(--text-muted)]">
                  No tasks available to group by project.
                </div>
              ) : (
                <div className="w-full h-[210px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={projectDistributionData}
                      margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={activeTheme.borderSubtle} vertical={false} />
                      <XAxis
                        dataKey="project"
                        tick={{ fill: activeTheme.textSecondary, fontSize: 10 }}
                        axisLine={{ stroke: activeTheme.borderSubtle }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: activeTheme.textMuted, fontSize: 10 }}
                        axisLine={{ stroke: activeTheme.borderSubtle }}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: activeTheme.bgHover }}
                        contentStyle={{
                          backgroundColor: activeTheme.bgElevated,
                          border: `1px solid ${activeTheme.borderStrong}`,
                          borderRadius: '6px',
                          fontSize: '11px',
                          color: activeTheme.textPrimary,
                        }}
                      />
                      <Bar dataKey="open" name="Open" stackId="a" fill={activeTheme.accent} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="done" name="Done" stackId="a" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSettingsModalOpen(false);
          }}
        >
          <div className="w-full max-w-[540px] max-h-[88vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg p-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
              <h2 id="settings-modal-title" className="text-[13px] font-semibold">
                Settings
              </h2>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                aria-label="Close"
                className="w-6 h-6 inline-flex items-center justify-center rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Theme Section */}
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">Theme</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
                  const t = THEMES[key];
                  const isSelected = theme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTheme(key)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded border text-[11px] text-left transition-colors ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] font-semibold'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="inline-flex items-center shrink-0">
                        <span
                          className="w-3 h-3 rounded-l-[3px] border border-white/15"
                          style={{ backgroundColor: t.bgSurface }}
                        />
                        <span
                          className="w-2.5 h-3 rounded-r-[3px]"
                          style={{ backgroundColor: t.accent }}
                        />
                      </span>
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-[var(--border-subtle)]" />

            {/* Pagination Section */}
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">Pagination</div>
              <div className="flex items-center justify-between gap-3 px-2.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <label htmlFor="page-size-input" className="text-[11px] font-semibold text-[var(--text-primary)]">
                    Tasks per page
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Number of tasks shown on each page (default: 10).
                  </span>
                </div>
                <input
                  id="page-size-input"
                  type="number"
                  min={1}
                  max={500}
                  value={pageSize}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!isNaN(n) && n >= 1) {
                      setPageSize(Math.min(500, n));
                      setCurrentPage(1);
                    }
                  }}
                  className="w-[72px] h-[26px] px-2 text-center text-[11px] tabular-nums bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="h-px bg-[var(--border-subtle)]" />

            {/* Checkbox Priority Colors */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                  Checkbox Priority Colors (A–F)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPriorityColors({ ...DEFAULT_PRIORITY_COLORS });
                    setColorizeCheckboxes(true);
                  }}
                  className="h-6 px-2 text-[11px] rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
                >
                  Reset Colors
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 px-2.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <label htmlFor="colorize-checkboxes-toggle" className="text-[11px] font-semibold text-[var(--text-primary)]">
                    Color checkboxes by priority
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Tint task checkboxes based on (A) through (F) priority.
                  </span>
                </div>
                <input
                  id="colorize-checkboxes-toggle"
                  type="checkbox"
                  checked={colorizeCheckboxes}
                  onChange={(e) => setColorizeCheckboxes(e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {PRIORITIES.map((letter) => (
                  <div
                    key={letter}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded text-[11px]"
                  >
                    <span>
                      Priority <strong>({letter})</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-[var(--text-secondary)] w-[56px]">
                        {priorityColors[letter]}
                      </span>
                      <input
                        type="color"
                        value={priorityColors[letter]}
                        onChange={(e) =>
                          setPriorityColors((prev) => ({ ...prev, [letter]: e.target.value }))
                        }
                        aria-label={`Priority ${letter} checkbox color`}
                        className="w-[26px] h-[22px] p-0 border border-[var(--border-strong)] rounded bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-[var(--border-subtle)]" />

            {/* Priority Font Colors (A-F) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                  Priority Font Colors (A–F)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPriorityTextColors({ ...DEFAULT_TEXT_COLORS });
                    setColorizeText(true);
                    setBoldPriorityA(true);
                  }}
                  className="h-6 px-2 text-[11px] rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
                >
                  Reset Font Colors
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 px-2.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <label htmlFor="bold-priority-a-toggle" className="text-[11px] font-semibold text-[var(--text-primary)]">
                    Bold (A) priority tasks
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Render priority (A) task text in bold by default.
                  </span>
                </div>
                <input
                  id="bold-priority-a-toggle"
                  type="checkbox"
                  checked={boldPriorityA}
                  onChange={(e) => setBoldPriorityA(e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between gap-3 px-2.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <label htmlFor="colorize-text-toggle" className="text-[11px] font-semibold text-[var(--text-primary)]">
                    Color task text by priority
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Apply custom font colors to priorities (A) through (F).
                  </span>
                </div>
                <input
                  id="colorize-text-toggle"
                  type="checkbox"
                  checked={colorizeText}
                  onChange={(e) => setColorizeText(e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {PRIORITIES.map((letter) => (
                  <div
                    key={letter}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded text-[11px]"
                  >
                    <span>
                      Priority <strong>({letter})</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-[var(--text-secondary)] w-[56px]">
                        {priorityTextColors[letter]}
                      </span>
                      <input
                        type="color"
                        value={priorityTextColors[letter]}
                        onChange={(e) =>
                          setPriorityTextColors((prev) => ({ ...prev, [letter]: e.target.value }))
                        }
                        aria-label={`Priority ${letter} font color`}
                        className="w-[26px] h-[22px] p-0 border border-[var(--border-strong)] rounded bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customize Filters Modal */}
      {filtersModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filters-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setFiltersModalOpen(false);
          }}
        >
          <div className="w-full max-w-[540px] max-h-[88vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg p-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
              <h2 id="filters-modal-title" className="text-[13px] font-semibold">
                Customize Filter Buttons
              </h2>
              <button
                type="button"
                onClick={() => setFiltersModalOpen(false)}
                aria-label="Close"
                className="w-6 h-6 inline-flex items-center justify-center rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveFilter} className="flex flex-col gap-2">
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">
                {editingFilterId ? 'Edit Filter Button' : 'Add Custom Filter Button'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={filterLabelInput}
                  onChange={(e) => setFilterLabelInput(e.target.value)}
                  placeholder="Button label (e.g. Work)"
                  maxLength={24}
                  required
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <input
                  type="text"
                  value={filterQueryInput}
                  onChange={(e) => setFilterQueryInput(e.target.value)}
                  placeholder="Rule (e.g. +Work is:open)"
                  required
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                <select
                  value={filterColorInput}
                  onChange={(e) => setFilterColorInput(e.target.value as FilterColor)}
                  aria-label="Button accent color"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="blue">Accent: Blue</option>
                  <option value="amber">Accent: Amber</option>
                  <option value="emerald">Accent: Green</option>
                  <option value="rose">Accent: Rose</option>
                  <option value="violet">Accent: Violet</option>
                  <option value="sky">Accent: Sky</option>
                </select>
                <div className="flex justify-end gap-1.5">
                  {editingFilterId && (
                    <button
                      type="button"
                      onClick={resetFilterForm}
                      className="h-6 px-2.5 text-[11px] rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="h-6 px-3 text-[11px] font-medium rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)]"
                  >
                    {editingFilterId ? 'Update Button' : 'Add Button'}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                Query syntax: combine tokens with spaces (AND) or <code className="text-[var(--text-secondary)]">OR</code>. Supports{' '}
                <code className="text-[var(--text-secondary)]">+project</code>, <code className="text-[var(--text-secondary)]">@context</code>,{' '}
                <code className="text-[var(--text-secondary)]">(A)</code> or <code className="text-[var(--text-secondary)]">(A-B)</code>,{' '}
                <code className="text-[var(--text-secondary)]">is:open</code>, <code className="text-[var(--text-secondary)]">is:done</code>,{' '}
                <code className="text-[var(--text-secondary)]">due:today</code>, <code className="text-[var(--text-secondary)]">due:overdue</code>, negation{' '}
                <code className="text-[var(--text-secondary)]">-@waiting</code>, or plain text.
              </p>
            </form>

            <div className="h-px bg-[var(--border-subtle)]" />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[var(--text-secondary)]">Active Filter Buttons</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    setActiveFilterId('f_all');
                    setCurrentPage(1);
                    resetFilterForm();
                  }}
                  className="h-6 px-2 text-[11px] rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {filters.map((f, index) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-[var(--text-primary)]">
                        {f.label}
                        {f.visible === false ? ' (Hidden)' : ''}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                        {f.query || '(shows all tasks)'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveFilterUp(index)}
                        title="Move up"
                        className="w-6 h-6 inline-flex items-center justify-center rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFilters((prev) =>
                            prev.map((item) =>
                              item.id === f.id ? { ...item, visible: item.visible === false } : item
                            )
                          )
                        }
                        className="h-6 px-2 text-[10px] rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)]"
                      >
                        {f.visible === false ? 'Show' : 'Hide'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFilterId(f.id);
                          setFilterLabelInput(f.label);
                          setFilterQueryInput(f.query);
                          setFilterColorInput(f.color || 'blue');
                        }}
                        aria-label={`Edit ${f.label}`}
                        className="w-6 h-6 inline-flex items-center justify-center rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)]"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={filters.length <= 1}
                        onClick={() => {
                          setFilters((prev) => prev.filter((item) => item.id !== f.id));
                          if (activeFilterId === f.id && filters.length > 1) {
                            const fallback = filters.find((item) => item.id !== f.id);
                            if (fallback) setActiveFilterId(fallback.id);
                          }
                        }}
                        aria-label={`Delete ${f.label}`}
                        className="w-6 h-6 inline-flex items-center justify-center rounded border border-red-500/35 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-40"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup & Restore Modal */}
      {backupModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="backup-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBackupModalOpen(false);
          }}
        >
          <div className="w-full max-w-[540px] max-h-[88vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg p-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
              <h2 id="backup-modal-title" className="text-[13px] font-semibold">
                Local Backup &amp; Restore
              </h2>
              <button
                type="button"
                onClick={() => setBackupModalOpen(false)}
                aria-label="Close"
                className="w-6 h-6 inline-flex items-center justify-center rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="px-2.5 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[10px] text-[var(--text-secondary)] tabular-nums">
                Ready to back up: {tasks.length} tasks · {filters.length} filter views · theme ({activeTheme.label}), pagination &amp; colors
              </div>
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">Export Data &amp; Offline App</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const payload = JSON.stringify(
                      {
                        version: 2,
                        exportedAt: new Date().toISOString(),
                        tasks,
                        filters,
                        settings: buildSettingsPayload(),
                      },
                      null,
                      2
                    );
                    downloadBlob(
                      `todotxt_full_backup_${todayISO()}.json`,
                      payload,
                      'application/json;charset=utf-8'
                    );
                    showToast('Exported full backup (tasks, views & settings)');
                  }}
                  className="h-7 px-2.5 text-[11px] font-medium rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] inline-flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  <span>Export Full Backup (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const payload = JSON.stringify(
                      {
                        version: 2,
                        type: 'settings_and_views',
                        exportedAt: new Date().toISOString(),
                        filters,
                        settings: buildSettingsPayload(),
                      },
                      null,
                      2
                    );
                    downloadBlob(
                      `todotxt_settings_views_${todayISO()}.json`,
                      payload,
                      'application/json;charset=utf-8'
                    );
                    showToast('Exported settings & custom views');
                  }}
                  className="h-7 px-2.5 text-[11px] rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] inline-flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  <span>Export Settings &amp; Views (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const content = tasks.map((t) => t.raw).join('\n');
                    downloadBlob(`todo_${todayISO()}.txt`, content, 'text/plain;charset=utf-8');
                    showToast('Exported todo.txt');
                  }}
                  className="h-7 px-2.5 text-[11px] rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] inline-flex items-center justify-center gap-1.5"
                >
                  <FileDown className="w-3 h-3" />
                  <span>Export todo.txt</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const content = tasks.map((t) => t.raw).join('\n');
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(content);
                      showToast(`Copied ${tasks.length} lines to clipboard`);
                    } else {
                      setPasteImportText(content);
                      showToast('Lines placed in text area below');
                    }
                  }}
                  className="h-7 px-2.5 text-[11px] rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
                >
                  Copy todo.txt
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDownloadStandaloneHtml('TODOTXT.html')}
                  className="h-7 px-2.5 text-[11px] rounded border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                >
                  Download Cache Version (TODOTXT.html)
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadStandaloneHtml('TODOTXT-localfile.html')}
                  className="h-7 px-2.5 text-[11px] rounded border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] hover:brightness-110"
                >
                  Download Local File Version (TODOTXT-localfile.html)
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                <strong className="text-[var(--text-secondary)]">Full Backup (.json)</strong> saves all tasks, custom filter views, theme, pagination, and priority colors. <strong className="text-[var(--text-secondary)]">Settings &amp; Views (.json)</strong> exports only your custom views and settings.
              </p>
            </div>

            <div className="h-px bg-[var(--border-subtle)]" />

            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">Restore / Import</div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-6 px-2.5 text-[11px] rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3 h-3" />
                  <span>Import .txt or .json File</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.json,text/plain,application/json"
                  onChange={handleFileImport}
                  className="hidden"
                />
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as ImportMode)}
                  aria-label="Import mode"
                  className="h-6 px-2 text-[10px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded text-[var(--text-secondary)]"
                >
                  <option value="merge">Tasks: Merge unique</option>
                  <option value="replace">Tasks: Replace all</option>
                </select>
              </div>

              <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreSettingsOnImport}
                  onChange={(e) => setRestoreSettingsOnImport(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[var(--accent)]"
                />
                <span>Restore settings &amp; custom filter views when importing a .json backup</span>
              </label>

              <textarea
                value={pasteImportText}
                onChange={(e) => setPasteImportText(e.target.value)}
                placeholder="Or paste raw todo.txt lines or JSON backup here..."
                className="w-full min-h-[96px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded p-2 text-[10px] font-mono text-[var(--text-primary)] resize-y focus:outline-none focus:border-[var(--accent)]"
              />

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const before = tasks.length;
                    undoSnapshotRef.current = tasks;
                    const remaining = tasks.filter((t) => !parseTodoLine(t.raw).completed);
                    const removed = before - remaining.length;
                    setTasks(remaining);
                    setBackupModalOpen(false);
                    if (removed > 0) {
                      showToast(`Purged ${removed} completed task(s)`, true);
                    } else {
                      showToast('No completed tasks to purge');
                    }
                  }}
                  className="h-6 px-2.5 text-[11px] rounded border border-red-500/35 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                >
                  Purge Completed
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!pasteImportText.trim()) return;
                    handleBackupPayloadImport(pasteImportText);
                    setPasteImportText('');
                    setBackupModalOpen(false);
                  }}
                  className="h-6 px-3 text-[11px] font-medium rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)]"
                >
                  Import Pasted Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-12 right-3.5 z-[100] bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-md px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] flex items-center gap-2.5 shadow-xl"
        >
          <span>{toast.message}</span>
          {toast.canUndo && (
            <button
              type="button"
              onClick={handleUndo}
              className="text-[var(--accent)] font-semibold hover:underline"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
