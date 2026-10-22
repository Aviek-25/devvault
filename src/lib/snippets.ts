
export type Snippet = {
  id: number;
  title: string;
  language: string;
  code: string;
  tags: string[];
  favorite: boolean;
  updated: string;
};

const STORAGE_KEY = "devvault-snippets-v1";

export const defaultSnippets: Snippet[] = [
  {
    id: 1,
    title: "Debounce Function",
    language: "JavaScript",
    code: `function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}`,
    tags: ["utility", "performance"],
    favorite: true,
    updated: "Recently",
  },
  {
    id: 2,
    title: "Fetch API Wrapper",
    language: "TypeScript",
    code: `async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Request failed");
  return response.json() as Promise<T>;
}`,
    tags: ["api", "async"],
    favorite: false,
    updated: "Recently",
  },
  {
    id: 3,
    title: "Flexbox Center",
    language: "CSS",
    code: `.container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}`,
    tags: ["layout", "css"],
    favorite: true,
    updated: "Recently",
  },
];

export function loadSnippets(): Snippet[] {
  if (typeof window === "undefined") return defaultSnippets;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return defaultSnippets;

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) return defaultSnippets;

    return parsed as Snippet[];
  } catch {
    return defaultSnippets;
  }
}

export function saveSnippets(snippets: Snippet[]): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
}
