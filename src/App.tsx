import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  Check,
  Download,
  FileDown,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

type FilterColor = 'blue' | 'amber' | 'emerald' | 'rose' | 'violet' | 'sky';
type SortMode = 'priority' | 'added' | 'alpha' | 'due';
type ImportMode = 'merge' | 'replace';

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

const STORAGE_KEYS = {
  TASKS: 'todotxt_offline_tasks_v1',
  FILTERS: 'todotxt_offline_filters_v1',
  SETTINGS: 'todotxt_offline_settings_v1',
  INIT: 'todotxt_offline_init_v1',
};

const DEFAULT_FILTERS: FilterButtonConfig[] = [
  { id: 'f_all', label: 'All', query: '', color: 'blue', visible: true },
  { id: 'f_open', label: 'Open', query: 'is:open', color: 'sky', visible: true },
  { id: 'f_high', label: 'Priority A-B', query: '(A-B) is:open', color: 'amber', visible: true },
  { id: 'f_done', label: 'Done', query: 'is:done', color: 'emerald', visible: true },
];

const SAMPLE_TASKS: string[] = [
  '(A) 2026-11-22 Finalize quarterly budget review +Finance @office due:2026-11-24',
  '(A) 2026-11-22 Call clinic to confirm Friday appointment +Health @phone',
  '(B) 2026-11-21 Draft release notes for offline client +Work @laptop',
  '(B) 2026-11-20 Buy coffee beans and oat milk +Home @errands',
  '(C) 2026-11-19 Archive old project folders +Maintenance @computer',
  '2026-11-18 Read backup verification checklist +Ops @reading',
  'x 2026-11-22 2026-11-17 Sync local storage export test +Work @laptop',
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
      projects.push(tok.slice(1));
    } else if (/^@\S+/.test(tok)) {
      contexts.push(tok.slice(1));
    } else if (/^[a-zA-Z][a-zA-Z0-9_-]*:[^\s]+$/.test(tok) && !/^https?:\/\//i.test(tok)) {
      const colonIdx = tok.indexOf(':');
      const k = tok.slice(0, colonIdx).toLowerCase();
      const v = tok.slice(colonIdx + 1);
      meta[k] = v;
    } else {
      contentParts.push(tok);
    }
  }

  const content = contentParts.join(' ').trim() || remaining || text;

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
  blue: 'bg-blue-500/15 border-blue-500 text-white',
  amber: 'bg-amber-500/15 border-amber-500 text-white',
  emerald: 'bg-emerald-500/15 border-emerald-500 text-white',
  rose: 'bg-rose-500/15 border-rose-500 text-white',
  violet: 'bg-violet-500/15 border-violet-500 text-white',
  sky: 'bg-sky-500/15 border-sky-500 text-white',
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

  const [newTaskText, setNewTaskText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskDraft, setEditingTaskDraft] = useState('');

  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);

  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [filterLabelInput, setFilterLabelInput] = useState('');
  const [filterQueryInput, setFilterQueryInput] = useState('');
  const [filterColorInput, setFilterColorInput] = useState<FilterColor>('blue');

  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [pasteImportText, setPasteImportText] = useState('');

  const [toast, setToast] = useState<{ message: string; canUndo: boolean } | null>(null);
  const undoSnapshotRef = useRef<TaskItem[] | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const addInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync persistence to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filters));
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify({ activeFilterId, sortBy })
      );
      localStorage.setItem(STORAGE_KEYS.INIT, '1');
    } catch {
      // ignore storage quota errors
    }
  }, [tasks, filters, activeFilterId, sortBy]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape') {
        setFiltersModalOpen(false);
        setBackupModalOpen(false);
        setEditingTaskId(null);
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

    const matched = parsedTasks.filter(({ parsed }) => {
      if (!matchesQuery(parsed, filterQuery)) return false;
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
        return a.parsed.content.localeCompare(b.parsed.content);
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
  }, [parsedTasks, effectiveActiveFilter, searchQuery, sortBy]);

  const openCount = useMemo(
    () => parsedTasks.filter((t) => !t.parsed.completed).length,
    [parsedTasks]
  );

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newTaskText.trim();
    if (!raw) return;
    setTasks((prev) => [{ id: uid(), raw }, ...prev]);
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
    showToast(`Imported ${clean.length} task(s).`);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      if (file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('{')) {
        try {
          const obj = JSON.parse(text);
          if (Array.isArray(obj.tasks)) {
            const lines = obj.tasks.map((t: unknown) =>
              typeof t === 'string' ? t : (t as { raw: string }).raw
            );
            if (importMode === 'replace' && Array.isArray(obj.filters) && obj.filters.length > 0) {
              setFilters(obj.filters);
            }
            handleImportLines(lines, importMode);
            setBackupModalOpen(false);
            return;
          }
        } catch {
          // fallback to line import
        }
      }
      handleImportLines(text.split(/\r?\n/), importMode);
      setBackupModalOpen(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadStandaloneHtml = async () => {
    try {
      const res = await fetch('/TODOTXT.html');
      if (!res.ok) throw new Error('Fetch failed');
      const html = await res.text();
      downloadBlob('TODOTXT.html', html, 'text/html;charset=utf-8');
      showToast('Downloaded offline TODOTXT.html');
    } catch {
      showToast('Unable to download TODOTXT.html');
    }
  };

  return (
    <div className="min-h-full bg-[#0b0d10] text-[#e6e9ef]">
      <div className="max-w-[1100px] mx-auto min-h-screen flex flex-col px-3 py-2.5 pb-6 gap-2">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#232834]">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h1 className="text-[14px] font-bold tracking-[0.02em] text-[#e6e9ef] whitespace-nowrap shrink-0">
              TODOTXT
            </h1>
            <span className="text-[11px] text-[#8c95a6] tabular-nums whitespace-nowrap">
              {displayedTasks.length} shown · {openCount} open · {tasks.length} total
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                resetFilterForm();
                setFiltersModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 h-6 px-2 text-[11px] font-medium rounded border border-[#232834] bg-[#12151b] text-[#e6e9ef] hover:bg-[#1d222c] hover:border-[#323949] transition-colors whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Customize Filters</span>
            </button>

            <button
              type="button"
              onClick={() => setBackupModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-6 px-2 text-[11px] font-medium rounded border border-[#232834] bg-[#12151b] text-[#e6e9ef] hover:bg-[#1d222c] hover:border-[#323949] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3 h-3" />
              <span>Backup &amp; Restore</span>
            </button>
          </div>
        </header>

        {/* Add & Search Controls */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-1.5">
          <form
            onSubmit={handleAddTask}
            className="flex items-center bg-[#12151b] border border-[#232834] rounded focus-within:border-[#3b82f6] transition-colors"
          >
            <input
              ref={addInputRef}
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add task in todo.txt format (e.g. (A) Buy milk +Home @errands due:2026-11-25)"
              aria-label="New task in todo.txt format"
              autoComplete="off"
              className="w-full h-[30px] px-2.5 bg-transparent border-none text-[11px] text-[#e6e9ef] placeholder-[#5a6272] focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 h-[22px] px-2 mr-1 rounded text-[10px] font-semibold bg-[#3b82f6] hover:bg-[#2563eb] text-white whitespace-nowrap shrink-0 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </form>

          <div className="flex items-center bg-[#12151b] border border-[#232834] rounded focus-within:border-[#3b82f6] transition-colors">
            <Search className="w-3 h-3 ml-2.5 text-[#5a6272] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, +project, @context... (/)"
              aria-label="Search tasks"
              autoComplete="off"
              className="w-full h-[30px] px-2 bg-transparent border-none text-[11px] text-[#e6e9ef] placeholder-[#5a6272] focus:outline-none"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="inline-flex items-center justify-center w-5 h-5 mr-1 rounded text-[#8c95a6] hover:bg-[#1d222c] hover:text-[#e6e9ef]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
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
                  onClick={() => setActiveFilterId(f.id)}
                  className={`inline-flex items-center gap-1.5 h-6 px-2 rounded text-[10px] font-medium border whitespace-nowrap transition-colors ${
                    isActive
                      ? ACTIVE_COLOR_STYLES[f.color || 'blue']
                      : 'bg-[#12151b] border-[#232834] text-[#8c95a6] hover:bg-[#1d222c] hover:text-[#e6e9ef] hover:border-[#323949]'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="tabular-nums opacity-70 text-[9px]">{filterCounts[f.id] ?? 0}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortMode)}
              aria-label="Sort tasks"
              className="h-6 px-1.5 text-[10px] bg-[#12151b] border border-[#232834] rounded text-[#8c95a6] cursor-pointer focus:outline-none focus:border-[#3b82f6]"
            >
              <option value="priority">Sort: Priority</option>
              <option value="added">Sort: Order</option>
              <option value="alpha">Sort: A-Z</option>
              <option value="due">Sort: Due Date</option>
            </select>
          </div>
        </div>

        {/* Compact Task List (10px font-size, content-only) */}
        <main className="bg-[#12151b] border border-[#232834] rounded-md overflow-hidden flex-1">
          {displayedTasks.length === 0 ? (
            <div className="py-7 px-4 text-center text-[#8c95a6] text-[11px]">
              <p className="mb-2.5">
                {tasks.length === 0
                  ? 'No tasks yet. Add one above in todo.txt format.'
                  : 'No tasks match this filter or search.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (filters.length > 0) {
                    setFilters((prev) =>
                      prev.map((f, idx) => (idx === 0 ? { ...f, visible: true } : f))
                    );
                    setActiveFilterId(filters[0].id);
                  }
                }}
                className="inline-flex items-center h-6 px-2.5 text-[11px] font-medium rounded border border-[#232834] bg-[#181c24] text-[#e6e9ef] hover:bg-[#1d222c]"
              >
                Show All Tasks
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#232834]/65" aria-label="Tasks">
              {displayedTasks.map(({ task, parsed }) => (
                <li
                  key={task.id}
                  className="flex items-center gap-1.5 px-1.5 py-0.5 min-h-[22px] hover:bg-[#1d222c] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id)}
                    aria-label={parsed.completed ? 'Mark incomplete' : 'Mark complete'}
                    className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors ${
                      parsed.completed
                        ? 'bg-[#22c55e] border-[#22c55e] text-[#0b0d10]'
                        : 'border-[#323949] bg-transparent text-transparent hover:border-[#3b82f6]'
                    }`}
                  >
                    {parsed.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>

                  {editingTaskId === task.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingTaskDraft}
                      onChange={(e) => setEditingTaskDraft(e.target.value)}
                      onBlur={() => handleCommitEdit(task.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCommitEdit(task.id);
                        } else if (e.key === 'Escape') {
                          setEditingTaskId(null);
                        }
                      }}
                      aria-label="Edit raw todo.txt line"
                      className="flex-1 min-w-0 h-5 px-1.5 text-[10px] font-mono bg-[#0b0d10] border border-[#3b82f6] rounded-[3px] text-[#e6e9ef] focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTaskId(task.id);
                        setEditingTaskDraft(task.raw);
                      }}
                      title="Click to edit task"
                      className={`flex-1 min-w-0 text-left text-[10px] leading-[1.35] tracking-[0.01em] py-0.5 break-words cursor-text ${
                        parsed.completed ? 'text-[#5a6272] line-through' : 'text-[#e6e9ef]'
                      }`}
                    >
                      {parsed.content}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveTask(task.id)}
                    aria-label="Remove task"
                    className="w-5 h-[18px] rounded-[3px] inline-flex items-center justify-center text-[#5a6272] hover:bg-red-500/15 hover:text-red-300 shrink-0 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>

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
          <div className="w-full max-w-[520px] max-h-[88vh] overflow-y-auto bg-[#12151b] border border-[#323949] rounded-lg p-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#232834]">
              <h2 id="filters-modal-title" className="text-[13px] font-semibold">
                Customize Filter Buttons
              </h2>
              <button
                type="button"
                onClick={() => setFiltersModalOpen(false)}
                aria-label="Close"
                className="w-6 h-6 inline-flex items-center justify-center rounded border border-[#232834] text-[#8c95a6] hover:bg-[#1d222c] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveFilter} className="flex flex-col gap-2">
              <div className="text-[11px] font-medium text-[#8c95a6]">
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
                  className="w-full bg-[#0b0d10] border border-[#232834] rounded px-2 py-1.5 text-[11px] text-[#e6e9ef] focus:outline-none focus:border-[#3b82f6]"
                />
                <input
                  type="text"
                  value={filterQueryInput}
                  onChange={(e) => setFilterQueryInput(e.target.value)}
                  placeholder="Rule (e.g. +Work is:open)"
                  required
                  className="w-full bg-[#0b0d10] border border-[#232834] rounded px-2 py-1.5 text-[11px] text-[#e6e9ef] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                <select
                  value={filterColorInput}
                  onChange={(e) => setFilterColorInput(e.target.value as FilterColor)}
                  aria-label="Button accent color"
                  className="w-full bg-[#0b0d10] border border-[#232834] rounded px-2 py-1.5 text-[11px] text-[#e6e9ef] focus:outline-none focus:border-[#3b82f6]"
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
                      className="h-6 px-2.5 text-[11px] rounded border border-[#232834] bg-[#181c24] hover:bg-[#1d222c]"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="h-6 px-3 text-[11px] font-medium rounded bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                  >
                    {editingFilterId ? 'Update Button' : 'Add Button'}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[#5a6272] leading-relaxed">
                Query syntax: combine tokens with spaces (AND) or <code className="text-[#8c95a6]">OR</code>. Supports{' '}
                <code className="text-[#8c95a6]">+project</code>, <code className="text-[#8c95a6]">@context</code>,{' '}
                <code className="text-[#8c95a6]">(A)</code> or <code className="text-[#8c95a6]">(A-B)</code>,{' '}
                <code className="text-[#8c95a6]">is:open</code>, <code className="text-[#8c95a6]">is:done</code>,{' '}
                <code className="text-[#8c95a6]">due:today</code>, <code className="text-[#8c95a6]">due:overdue</code>, negation{' '}
                <code className="text-[#8c95a6]">-@waiting</code>, or plain text.
              </p>
            </form>

            <div className="h-px bg-[#232834]" />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#8c95a6]">Active Filter Buttons</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    setActiveFilterId('f_all');
                    resetFilterForm();
                  }}
                  className="h-6 px-2 text-[11px] rounded border border-[#232834] bg-[#181c24] hover:bg-[#1d222c]"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {filters.map((f, index) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 bg-[#0b0d10] border border-[#232834] rounded"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-[#e6e9ef]">
                        {f.label}
                        {f.visible === false ? ' (Hidden)' : ''}
                      </div>
                      <div className="text-[10px] font-mono text-[#5a6272] truncate">
                        {f.query || '(shows all tasks)'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveFilterUp(index)}
                        title="Move up"
                        className="w-6 h-6 inline-flex items-center justify-center rounded border border-[#232834] bg-[#12151b] hover:bg-[#1d222c] disabled:opacity-40"
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
                        className="h-6 px-2 text-[10px] rounded border border-[#232834] bg-[#12151b] hover:bg-[#1d222c]"
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
                        className="w-6 h-6 inline-flex items-center justify-center rounded border border-[#232834] bg-[#12151b] hover:bg-[#1d222c]"
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
          <div className="w-full max-w-[520px] max-h-[88vh] overflow-y-auto bg-[#12151b] border border-[#323949] rounded-lg p-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#232834]">
              <h2 id="backup-modal-title" className="text-[13px] font-semibold">
                Local Backup &amp; Restore
              </h2>
              <button
                type="button"
                onClick={() => setBackupModalOpen(false)}
                aria-label="Close"
                className="w-6 h-6 inline-flex items-center justify-center rounded border border-[#232834] text-[#8c95a6] hover:bg-[#1d222c] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-medium text-[#8c95a6]">Export Data &amp; Offline App</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const content = tasks.map((t) => t.raw).join('\n');
                    downloadBlob(`todo_${todayISO()}.txt`, content, 'text/plain;charset=utf-8');
                    showToast('Exported todo.txt');
                  }}
                  className="h-7 px-2.5 text-[11px] rounded border border-[#232834] bg-[#181c24] hover:bg-[#1d222c] inline-flex items-center justify-center gap-1.5"
                >
                  <FileDown className="w-3 h-3" />
                  <span>Export todo.txt</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const payload = JSON.stringify(
                      {
                        version: 1,
                        exportedAt: new Date().toISOString(),
                        tasks,
                        filters,
                        sortBy,
                      },
                      null,
                      2
                    );
                    downloadBlob(
                      `todotxt_backup_${todayISO()}.json`,
                      payload,
                      'application/json;charset=utf-8'
                    );
                    showToast('Exported full JSON backup');
                  }}
                  className="h-7 px-2.5 text-[11px] rounded border border-[#232834] bg-[#181c24] hover:bg-[#1d222c] inline-flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  <span>Export Full JSON</span>
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
                  className="h-7 px-2.5 text-[11px] rounded border border-[#232834] bg-[#181c24] hover:bg-[#1d222c]"
                >
                  Copy todo.txt
                </button>
                <button
                  type="button"
                  onClick={handleDownloadStandaloneHtml}
                  className="h-7 px-2.5 text-[11px] rounded border border-[#3b82f6]/40 bg-[#3b82f6]/10 text-blue-300 hover:bg-[#3b82f6]/20"
                >
                  Download Offline TODOTXT.html
                </button>
              </div>
              <p className="text-[10px] text-[#5a6272] leading-relaxed">
                <code className="text-[#8c95a6]">todo.txt</code> exports standard plain-text lines. Full JSON includes tasks and custom filter buttons. You can also download the standalone zero-dependency <code className="text-[#8c95a6]">TODOTXT.html</code> file for completely offline use.
              </p>
            </div>

            <div className="h-px bg-[#232834]" />

            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-medium text-[#8c95a6]">Restore / Import</div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-6 px-2.5 text-[11px] rounded border border-[#232834] bg-[#181c24] hover:bg-[#1d222c] inline-flex items-center gap-1.5"
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
                  className="h-6 px-2 text-[10px] bg-[#0b0d10] border border-[#232834] rounded text-[#8c95a6]"
                >
                  <option value="merge">Mode: Merge unique</option>
                  <option value="replace">Mode: Replace all</option>
                </select>
              </div>

              <textarea
                value={pasteImportText}
                onChange={(e) => setPasteImportText(e.target.value)}
                placeholder="Or paste raw todo.txt lines here (one task per line)..."
                className="w-full min-h-[96px] bg-[#0b0d10] border border-[#232834] rounded p-2 text-[10px] font-mono text-[#e6e9ef] resize-y focus:outline-none focus:border-[#3b82f6]"
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
                    handleImportLines(pasteImportText.split(/\r?\n/), importMode);
                    setPasteImportText('');
                    setBackupModalOpen(false);
                  }}
                  className="h-6 px-3 text-[11px] font-medium rounded bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                >
                  Import Pasted Lines
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
          className="fixed bottom-3.5 right-3.5 z-[100] bg-[#181c24] border border-[#323949] rounded-md px-2.5 py-1.5 text-[11px] text-[#e6e9ef] flex items-center gap-2.5 shadow-xl"
        >
          <span>{toast.message}</span>
          {toast.canUndo && (
            <button
              type="button"
              onClick={handleUndo}
              className="text-[#3b82f6] font-semibold hover:underline"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
