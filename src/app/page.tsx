"use client";

import Editor from "@monaco-editor/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import AuthGuard from "@/components/AuthGuard";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  Plus,
  Code2,
  Heart,
  Copy,
  LayoutDashboard,
  Settings,
  ChevronDown,
  Command,
  X,
  Check,
  Trash2,
  Pencil,
  Terminal,
  Tag,
  Sparkles,
  Filter,
  LogOut,
  FolderOpen,
} from "lucide-react";

type Snippet = {
  id: number;
  title: string;
  language: string;
  code: string;
  tags: string[];
  favorite: boolean;
  updated: string;
  createdAt?: string;
  updatedAt?: string;
  collectionName?: string;
};

const initialSnippets: Snippet[] = [
  {
    id: 1,
    title: "Debounce Function",
    language: "JavaScript",
    code: "function debounce(fn, delay = 300) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n}",
    tags: ["utility", "performance"],
    favorite: true,
    updated: "2 hours ago",
  },
  {
    id: 2,
    title: "Fetch API Wrapper",
    language: "TypeScript",
    code: "async function fetchData<T>(url: string): Promise<T> {\n  const response = await fetch(url);\n  if (!response.ok) throw new Error('Request failed');\n  return response.json() as Promise<T>;\n}",
    tags: ["api", "async"],
    favorite: false,
    updated: "Yesterday",
  },
  {
    id: 3,
    title: "Flexbox Center",
    language: "CSS",
    code: ".container {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n}",
    tags: ["layout", "css"],
    favorite: true,
    updated: "2 days ago",
  },
  {
    id: 4,
    title: "Python List Flatten",
    language: "Python",
    code: "def flatten(items):\n    result = []\n    for item in items:\n        if isinstance(item, list):\n            result.extend(flatten(item))\n        else:\n            result.append(item)\n    return result",
    tags: ["python", "utility"],
    favorite: false,
    updated: "3 days ago",
  },
  {
    id: 5,
    title: "React useLocalStorage",
    language: "TypeScript",
    code: "function useLocalStorage<T>(key: string, initial: T) {\n  const [value, setValue] = useState<T>(() => {\n    if (typeof window === 'undefined') return initial;\n    const saved = localStorage.getItem(key);\n    return saved ? JSON.parse(saved) : initial;\n  });\n  return [value, setValue] as const;\n}",
    tags: ["react", "hooks"],
    favorite: false,
    updated: "4 days ago",
  },
  {
    id: 6,
    title: "SQL Pagination",
    language: "SQL",
    code: "SELECT id, title, created_at\nFROM snippets\nWHERE user_id = $1\nORDER BY created_at DESC\nLIMIT $2 OFFSET $3;",
    tags: ["database", "sql"],
    favorite: true,
    updated: "Last week",
  },
];

const languages = [
  "All Snippets",
  "JavaScript",
  "TypeScript",
  "Python",
  "CSS",
  "SQL",
];

const languageColors: Record<string, string> = {
  JavaScript: "text-yellow-300 bg-yellow-300/10 border-yellow-300/20",
  TypeScript: "text-sky-300 bg-sky-300/10 border-sky-300/20",
  Python: "text-green-300 bg-green-300/10 border-green-300/20",
  CSS: "text-pink-300 bg-pink-300/10 border-pink-300/20",
  SQL: "text-violet-300 bg-violet-300/10 border-violet-300/20",
};

function formatDateTime(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function DashboardContent() {
  const router = useRouter();
  const [snippets, setSnippets] = useState<Snippet[]>(initialSnippets);
  const [storageReady, setStorageReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("Connecting to cloud...");
  const [localBackup, setLocalBackup] = useState<Snippet[]>([]);
  const [showImportLocal, setShowImportLocal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("All Snippets");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [newLanguage, setNewLanguage] = useState("JavaScript");
  const [code, setCode] = useState("");
  const [tags, setTags] = useState("");
  const [collectionName, setCollectionName] = useState("Uncategorized");
  const [selectedCollection, setSelectedCollection] = useState("All Collections");
  const [selectedTag, setSelectedTag] = useState("All Tags");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Load the signed-in user's cloud snippets. Keep local data as a migration fallback.
  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) {
          setCloudStatus("Not signed in");
          setCloudReady(false);
        }
        return;
      }

      try {
        const saved = window.localStorage.getItem("devvault-snippets-v1");
        let localItems: Snippet[] = [];
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (Array.isArray(parsed)) localItems = parsed as Snippet[];
        }
        if (!cancelled) {
          setLocalBackup(localItems);
          setStorageReady(true);
        }

        const snapshot = await getDocs(
          collection(db, "users", user.uid, "snippets"),
        );
        if (cancelled) return;

        if (!snapshot.empty) {
          const cloudItems = snapshot.docs.map((item) => ({
            ...(item.data() as Snippet),
            id: Number(item.id),
          }));
          const cloudIds = new Set(cloudItems.map((item) => item.id));
          const localOnlyItems = localItems.filter((item) => !cloudIds.has(item.id));
          setSnippets([...localOnlyItems, ...cloudItems]);
          setShowImportLocal(localOnlyItems.length > 0);
          setCloudStatus(
            localOnlyItems.length
              ? "Cloud connected — some local snippets still need importing"
              : "Cloud sync connected",
          );
        } else {
          // Do not silently upload local/demo data. Let the user choose to import it.
          const fallback = localItems.length ? localItems : initialSnippets;
          setSnippets(fallback);
          setShowImportLocal(localItems.length > 0);
          setCloudStatus(
            localItems.length
              ? "Cloud is empty — local snippets are available to import"
              : "Cloud connected — create your first cloud snippet",
          );
        }
        setCloudReady(true);
      } catch (error) {
        console.error("Could not load cloud snippets:", error);
        if (!cancelled) {
          setCloudStatus("Cloud connection failed — check the console");
          setStorageReady(true);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Keep a local backup even after cloud sync is enabled.
  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem("devvault-snippets-v1", JSON.stringify(snippets));
    } catch (error) {
      console.error("Could not save DevVault local backup:", error);
    }
  }, [snippets, storageReady]);

  async function writeCloudSnippet(snippet: Snippet) {
    const user = auth.currentUser;
    if (!user) throw new Error("Please sign in again before saving.");
    await setDoc(
      doc(db, "users", user.uid, "snippets", String(snippet.id)),
      snippet,
    );
  }

  async function importLocalSnippets() {
    const user = auth.currentUser;
    if (!user) {
      setCloudStatus("Please sign in again before importing.");
      return;
    }
    setCloudStatus("Importing local snippets...");
    try {
      for (const snippet of localBackup) {
        await setDoc(
          doc(db, "users", user.uid, "snippets", String(snippet.id)),
          snippet,
        );
      }
      const merged = [
        ...localBackup,
        ...snippets.filter((item) => !localBackup.some((local) => local.id === item.id)),
      ];
      setSnippets(merged);
      setShowImportLocal(false);
      setCloudStatus(`Imported ${localBackup.length} local snippet(s) to the cloud`);
    } catch (error) {
      console.error("Could not import local snippets:", error);
      setCloudStatus("Import failed — check the console and try again");
    }
  }

  const availableCollections = useMemo(() => {
    const names = snippets
      .map((snippet) => snippet.collectionName?.trim() || "Uncategorized")
      .filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [snippets]);

  const availableTags = useMemo(() => {
    const names = snippets.flatMap((snippet) => snippet.tags);
    return [...new Set(names.map((tag) => tag.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [snippets]);

  const filtered = useMemo(
    () =>
      snippets.filter((s) => {
        const searchText = `${s.title} ${s.language} ${s.code} ${s.tags.join(" ")} ${s.collectionName ?? "Uncategorized"}`;
        const matchesSearch = searchText.toLowerCase().includes(search.trim().toLowerCase());
        const matchesLanguage = language === "All Snippets" || s.language === language;
        const matchesFavorite = !favoritesOnly || s.favorite;
        const matchesCollection = selectedCollection === "All Collections" || (s.collectionName?.trim() || "Uncategorized") === selectedCollection;
        const matchesTag = selectedTag === "All Tags" || s.tags.some((tag) => tag.toLowerCase() === selectedTag.toLowerCase());
        return matchesSearch && matchesLanguage && matchesFavorite && matchesCollection && matchesTag;
      }),
    [snippets, search, language, favoritesOnly, selectedCollection, selectedTag],
  );

  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Could not sign out:", error);
      window.alert("Sign out failed. Please try again.");
    }
  }

  async function copySnippet(snippet: Snippet) {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(snippet.id);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      window.prompt("Copy your code:", snippet.code);
    }
  }

  function openNewSnippet() {
    setEditingId(null);
    setTitle("");
    setNewLanguage("JavaScript");
    setCode("");
    setTags("");
    setCollectionName("Uncategorized");
    setShowForm(true);
  }

  function openEditSnippet(snippet: Snippet) {
    setEditingId(snippet.id);
    setTitle(snippet.title);
    setNewLanguage(snippet.language);
    setCode(snippet.code);
    setTags(snippet.tags.join(", "));
    setCollectionName(snippet.collectionName?.trim() || "Uncategorized");
    setShowForm(true);
  }

  async function saveSnippet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return;

    const parsedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const existing = editingId !== null
      ? snippets.find((snippet) => snippet.id === editingId)
      : undefined;

    const now = new Date().toISOString();
    const nextSnippet: Snippet = {
      id: editingId ?? Date.now(),
      title: title.trim(),
      language: newLanguage,
      code,
      tags: parsedTags,
      favorite: existing?.favorite ?? false,
      updated: "Just now",
      // Keep the original creation time when editing; update the modification time.
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      collectionName: collectionName.trim() || "Uncategorized",
    };

    try {
      await writeCloudSnippet(nextSnippet);
      setSnippets((old) =>
        editingId !== null
          ? old.map((snippet) => snippet.id === editingId ? nextSnippet : snippet)
          : [nextSnippet, ...old],
      );
      setCloudStatus("Cloud sync connected — changes saved");
    } catch (error) {
      console.error("Could not save snippet to Firestore:", error);
      window.alert("Could not save to the cloud. Your existing snippets have been kept. Please check your connection and try again.");
      return;
    }

    setTitle("");
    setCode("");
    setTags("");
    setCollectionName("Uncategorized");
    setNewLanguage("JavaScript");
    setEditingId(null);
    setShowForm(false);
    setLanguage("All Snippets");
    setFavoritesOnly(false);
    setSearch("");
  }

  async function toggleFavorite(snippet: Snippet) {
    const updatedSnippet = { ...snippet, favorite: !snippet.favorite };
    try {
      await writeCloudSnippet(updatedSnippet);
      setSnippets((old) =>
        old.map((item) => item.id === snippet.id ? updatedSnippet : item),
      );
      setCloudStatus("Cloud sync connected — changes saved");
    } catch (error) {
      console.error("Could not update favorite in Firestore:", error);
      window.alert("Could not update this favorite in the cloud. Please try again.");
    }
  }

  async function deleteSnippet(snippet: Snippet) {
    const confirmed = window.confirm(
      `Delete "${snippet.title}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    const user = auth.currentUser;
    if (!user) {
      window.alert("Please sign in again before deleting snippets.");
      return;
    }

    try {
      await deleteDoc(
        doc(db, "users", user.uid, "snippets", String(snippet.id)),
      );
      setSnippets((old) => old.filter((item) => item.id !== snippet.id));
      setCloudStatus("Cloud sync connected — snippet deleted");
    } catch (error) {
      console.error("Could not delete snippet from Firestore:", error);
      window.alert("Could not delete this snippet from the cloud. Please try again.");
    }
  }

  const favorites = snippets.filter((s) => s.favorite).length;

  return (
    <main className="min-h-screen bg-[#090b10] text-slate-100 selection:bg-cyan-400/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 left-1/3 h-[440px] w-[440px] rounded-full bg-cyan-500/[0.07] blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-violet-500/[0.06] blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[248px] shrink-0 border-r border-white/[0.07] bg-[#0c0e14]/80 p-6 lg:flex lg:flex-col">
          <a href="#" className="mb-12 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20">
              <Code2 size={23} />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">
                DevVault<span className="text-cyan-300">.</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Developer workspace
              </div>
            </div>
          </a>

          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Workspace
          </p>
          <button
            onClick={() => {
              setLanguage("All Snippets");
              setFavoritesOnly(false);
            }}
            className={`mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${!favoritesOnly ? "border border-cyan-300/15 bg-cyan-300/[0.08] text-cyan-200" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"}`}
          >
            <LayoutDashboard size={17} /> All Snippets
            <span className="ml-auto text-xs text-slate-500">
              {snippets.length}
            </span>
          </button>
          <button
            onClick={() => setFavoritesOnly(true)}
            className={`mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${favoritesOnly ? "border border-cyan-300/15 bg-cyan-300/[0.08] text-cyan-200" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"}`}
          >
            <Heart size={17} /> Favorites
            <span className="ml-auto text-xs text-slate-500">{favorites}</span>
          </button>

          <p className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Languages
          </p>
          {languages.slice(1).map((lang) => (
            <button
              key={lang}
              onClick={() => {
                setLanguage(lang);
                setFavoritesOnly(false);
              }}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${language === lang && !favoritesOnly ? "bg-white/[0.06] text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${lang === "JavaScript" ? "bg-yellow-300" : lang === "TypeScript" ? "bg-sky-300" : lang === "Python" ? "bg-green-300" : lang === "CSS" ? "bg-pink-300" : "bg-violet-300"}`}
              />
              {lang}
              <span className="ml-auto text-xs text-slate-600">
                {snippets.filter((s) => s.language === lang).length}
              </span>
            </button>
          ))}

          <div className="mt-auto rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.045] to-transparent p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={16} className="text-cyan-300" /> Your vault
            </div>
            <div className="mb-2 flex justify-between text-xs text-slate-400">
              <span>Snippets saved</span>
              <span>{snippets.length}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500"
                style={{ width: `${Math.min(100, snippets.length * 10)}%` }}
              />
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              Your reusable code, all in one place.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-white/[0.07] bg-[#090b10]/85 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] lg:hidden">
                <Code2 size={19} className="text-cyan-300" />
              </div>
              <div>
                <p className="text-sm font-semibold">My Workspace</p>
                <p className="hidden text-xs text-slate-500 sm:block">
                  Your personal library of reusable code
                </p>
                <p className="mt-1 text-[10px] text-cyan-300/80" role="status">
                  {cloudStatus}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showImportLocal && cloudReady && (
                <button
                  onClick={() => void importLocalSnippets()}
                  className="rounded-xl border border-cyan-300/30 px-3 py-2.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-300/10"
                  title="Copy your locally saved snippets into your cloud account"
                >
                  Import local
                </button>
              )}
              <button
                onClick={openNewSnippet}
                className="flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 sm:px-4"
              >
                <Plus size={17} />{" "}
                <span className="hidden sm:inline">New snippet</span>
                <span className="sm:hidden">New</span>
              </button>
              <button
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-200 sm:px-4"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </header>

          <div className="px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end"
            >
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-xs text-cyan-200">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />{" "}
                  YOUR DEVELOPER SPACE
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Your code,{" "}
                  <span className="bg-gradient-to-r from-cyan-200 via-sky-300 to-violet-300 bg-clip-text text-transparent">
                    within reach.
                  </span>
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                  Save your best code. Organize your thinking. Build faster, one
                  snippet at a time.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:min-w-[250px]">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="text-xs text-slate-500">Total snippets</div>
                  <div className="mt-2 text-2xl font-bold">
                    {snippets.length.toString().padStart(2, "0")}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    In your library
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="text-xs text-slate-500">Favorites</div>
                  <div className="mt-2 text-2xl font-bold">
                    {favorites.toString().padStart(2, "0")}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Quick access
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search titles, code, languages, tags, or collections..."
                  className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 focus:bg-white/[0.04]"
                />
                <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-500 md:flex">
                  <Command size={11} /> K
                </div>
              </div>
              <button
                onClick={() => {
                  setLanguage("All Snippets");
                  setFavoritesOnly(false);
                  setSearch("");
                  setSelectedCollection("All Collections");
                  setSelectedTag("All Tags");
                }}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-4 text-sm text-slate-300 transition hover:bg-white/[0.04]"
              >
                <Filter size={16} /> Reset filters
              </button>
              <button
                onClick={() => setShowAdvancedFilters((value) => !value)}
                className={`flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm transition ${showAdvancedFilters ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200" : "border-white/[0.08] text-slate-300 hover:bg-white/[0.04]"}`}
                aria-expanded={showAdvancedFilters}
              >
                <Settings size={16} /> Advanced filters
              </button>
            </div>

            {showAdvancedFilters && (
              <div className="mb-6 grid gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs text-slate-400">
                  Collection
                  <select value={selectedCollection} onChange={(e) => setSelectedCollection(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#151923] px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/50">
                    <option>All Collections</option>
                    {availableCollections.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
                <label className="text-xs text-slate-400">
                  Tag
                  <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#151923] px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/50">
                    <option>All Tags</option>
                    {availableTags.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
                <div className="flex items-end">
                  <button onClick={() => { setSelectedCollection("All Collections"); setSelectedTag("All Tags"); setLanguage("All Snippets"); setFavoritesOnly(false); setSearch(""); }} className="h-11 w-full rounded-xl border border-white/10 px-3 text-sm text-slate-300 transition hover:bg-white/[0.05]">Clear all filters</button>
                </div>
              </div>
            )}

            <div className="mb-7 flex flex-wrap items-center gap-2">
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                    setFavoritesOnly(false);
                  }}
                  className={`rounded-lg px-3.5 py-2 text-xs font-medium transition ${language === lang && !favoritesOnly ? "bg-white text-slate-950" : "border border-white/[0.07] bg-white/[0.02] text-slate-400 hover:bg-white/[0.06] hover:text-white"}`}
                >
                  {lang}
                </button>
              ))}
              <span className="ml-auto text-xs text-slate-500">
                {filtered.length} result{filtered.length === 1 ? "" : "s"}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
                <Search size={28} className="mb-4 text-slate-600" />
                <h3 className="font-semibold">No snippets found</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Try another search or create a new snippet.
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setLanguage("All Snippets");
                    setFavoritesOnly(false);
                    setSelectedCollection("All Collections");
                    setSelectedTag("All Tags");
                  }}
                  className="mt-4 text-sm text-cyan-300 hover:text-cyan-200"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {filtered.map((snippet, index) => (
                    <motion.article
                      key={snippet.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.25, delay: index * 0.035 }}
                      className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e1119]/85 transition hover:border-cyan-300/25 hover:bg-[#111520]"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035]">
                            <Terminal size={17} className="text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-slate-100">
                              {snippet.title}
                            </h3>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {formatDateTime(snippet.createdAt)
                                ? `Added ${formatDateTime(snippet.createdAt)}`
                                : `Added earlier · ${snippet.updated}`}
                            </p>
                            {formatDateTime(snippet.updatedAt) && snippet.updatedAt !== snippet.createdAt && (
                              <p className="mt-1 text-[10px] text-slate-600">
                                Edited {formatDateTime(snippet.updatedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            aria-label="Toggle favorite"
                            onClick={() => void toggleFavorite(snippet)}
                            className={`rounded-lg p-2 transition hover:bg-white/[0.07] ${snippet.favorite ? "text-rose-400" : "text-slate-500 hover:text-rose-300"}`}
                          >
                            <Heart
                              size={16}
                              fill={snippet.favorite ? "currentColor" : "none"}
                            />
                          </button>
                          <button
                            aria-label={`Edit ${snippet.title}`}
                            title="Edit snippet"
                            onClick={() => openEditSnippet(snippet)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.07] hover:text-cyan-200"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            aria-label={`Delete ${snippet.title}`}
                            title="Delete snippet"
                            onClick={() => deleteSnippet(snippet)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                          >
                            <Trash2 size={15} />
                          </button>
                          <button
                            aria-label="Copy code"
                            onClick={() => copySnippet(snippet)}
                            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2.5 py-2 text-xs text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-200"
                          >
                            {copied === snippet.id ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                            {copied === snippet.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto bg-[#090b10]/60 px-5 py-5">
                        
<SyntaxHighlighter
  language={
    {
      JavaScript: "javascript",
      TypeScript: "typescript",
      Python: "python",
      CSS: "css",
      SQL: "sql",
      HTML: "html",
      JSON: "json",
      Bash: "bash",
      Java: "java",
      "C++": "cpp",
    }[snippet.language] || "plaintext"
  }
  style={vscDarkPlus}
  customStyle={{
    margin: 0,
    padding: "20px",
    background: "transparent",
    fontSize: "12px",
    lineHeight: "1.85",
    minHeight: "110px",
  }}
  wrapLongLines
>
  {snippet.code}
</SyntaxHighlighter>

                      </div>
                      <div className="flex flex-wrap items-center gap-2 px-5 py-4">
                        <span className="flex items-center gap-1 rounded-md border border-cyan-300/15 bg-cyan-300/[0.06] px-2 py-1 text-[10px] text-cyan-200">
                          <FolderOpen size={10} /> {snippet.collectionName?.trim() || "Uncategorized"}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${languageColors[snippet.language] || "border-white/10 bg-white/5 text-slate-300"}`}
                        >
                          {snippet.language}
                        </span>
                        {snippet.tags.map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-1 rounded-md bg-white/[0.035] px-2 py-1 text-[10px] text-slate-400"
                          >
                            <Tag size={10} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            )}

            <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-white/[0.07] pt-6 text-xs text-slate-600 sm:flex-row">
              <p>© 2026 DevVault. Built for developers.</p>
              <p className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{" "}
                {cloudReady ? "Cloud storage connected" : "Connecting to cloud storage"}
              </p>
            </footer>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowForm(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="my-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#10131c] shadow-2xl shadow-black/50"
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
                <div>
                  <h2 className="font-semibold">{editingId !== null ? "Edit snippet" : "Create a snippet"}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {editingId !== null ? "Update your saved code snippet." : "Save a useful piece of code to your vault."}
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={saveSnippet} className="space-y-5 p-6">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    Snippet title
                  </label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. API request helper"
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan-300/50"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    Programming language
                  </label>
                  <div className="relative">
                    <select
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-[#151923] px-3 text-sm outline-none focus:border-cyan-300/50"
                    >
                      {[
                        "JavaScript",
                        "TypeScript",
                        "Python",
                        "CSS",
                        "SQL",
                        "HTML",
                        "Java",
                        "C++",
                        "JSON",
                        "Bash",
                      ].map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    Collection / project
                  </label>
                  <input
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    list="devvault-collection-options"
                    maxLength={60}
                    placeholder="e.g. KRATOS AI, Web Development, DSA"
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan-300/50"
                  />
                  <datalist id="devvault-collection-options">
                    {availableCollections.map((name) => <option key={name} value={name} />)}
                  </datalist>
                  <p className="mt-2 text-[11px] text-slate-500">Choose an existing collection or type a new name. It will be saved with this snippet in Firestore.</p>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    Code
                  </label>
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-[#090b10] transition focus-within:border-cyan-300/50">
                    <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.025] px-3 py-2">
                      <span className="text-[11px] text-slate-400">{newLanguage}</span>
                      <span className="text-[10px] text-slate-600">Monaco Editor</span>
                    </div>
                    <Editor
                      height="280px"
                      language={{
                        JavaScript: "javascript",
                        TypeScript: "typescript",
                        Python: "python",
                        CSS: "css",
                        SQL: "sql",
                        HTML: "html",
                        Java: "java",
                        "C++": "cpp",
                        JSON: "json",
                        Bash: "shell",
                      }[newLanguage] || "plaintext"}
                      theme="vs-dark"
                      value={code}
                      onChange={(value) => setCode(value ?? "")}
                      options={{
                        automaticLayout: true,
                        minimap: { enabled: false },
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        fontSize: 13,
                        lineHeight: 22,
                        tabSize: 2,
                        padding: { top: 14, bottom: 14 },
                        renderLineHighlight: "all",
                        roundedSelection: true,
                        readOnly: false,
                        overviewRulerBorder: false,
                        scrollbar: {
                          verticalScrollbarSize: 8,
                          horizontalScrollbarSize: 8,
                        },
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    Tags{" "}
                    <span className="text-slate-600">(comma separated)</span>
                  </label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="utility, api, helpers"
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan-300/50"
                  />
                </div>
                <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-5">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditingId(null); }}
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200"
                  >
                    {editingId !== null ? <Check size={16} /> : <Plus size={16} />} {editingId !== null ? "Save changes" : "Save snippet"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
