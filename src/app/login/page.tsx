
"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

type AuthMode = "login" | "signup";

function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  const messages: Record<string, string> = {
    "auth/email-already-in-use":
      "This email already has an account. Please sign in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/invalid-credential":
      "The email or password is incorrect. Please try again.",
    "auth/user-not-found":
      "No account was found for this email. Create an account first.",
    "auth/wrong-password":
      "The password is incorrect. Please try again.",
    "auth/weak-password":
      "Please choose a stronger password with at least 6 characters.",
    "auth/too-many-requests":
      "Too many attempts. Please wait a little and try again.",
    "auth/network-request-failed":
      "Network error. Check your internet connection.",
    "auth/operation-not-allowed":
      "This sign-in method is not enabled in Firebase Authentication.",
    "auth/popup-closed-by-user":
      "The Google sign-in window was closed before completion.",
    "auth/popup-blocked":
      "Your browser blocked the Google sign-in popup. Allow popups and try again.",
    "auth/unauthorized-domain":
      "This domain is not authorized in Firebase Authentication.",
    "auth/cancelled-popup-request":
      "Another sign-in popup is already open. Please try again.",
    "auth/account-exists-with-different-credential":
      "An account with this email already exists using a different sign-in method.",
  };

  return messages[code] ?? "Sign-in failed. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      }

      // Firebase has authenticated the user.
      // Return to the existing DevVault home page.
      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      await signInWithPopup(auth, provider);

      // Return to the existing DevVault home page.
      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode((current) => (current === "login" ? "signup" : "login"));
    setError("");
    setMessage("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111116] p-7 shadow-2xl sm:p-9">
        <header className="mb-8">
          <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-cyan-400">
            DEVAULT
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            {mode === "login"
              ? "Sign in to access your DevVault account."
              : "Create your account to get started with DevVault."}
          </p>
        </header>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm text-zinc-300"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm text-zinc-300"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-zinc-500">
          <div className="h-px flex-1 bg-white/10" />
          OR
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full rounded-xl border border-white/15 px-4 py-3 font-medium transition hover:border-cyan-400/50 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Please wait..." : "Continue with Google"}
        </button>

        {message && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300"
          >
            {message}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-500/10 p-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-zinc-400">
          {mode === "login"
            ? "New to DevVault?"
            : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={toggleMode}
            disabled={loading}
            className="font-medium text-cyan-400 transition hover:text-cyan-300 disabled:opacity-60"
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-5 w-full text-center text-sm text-zinc-500 transition hover:text-white"
        >
          ← Back to DevVault
        </button>
      </section>
    </main>
  );
}
