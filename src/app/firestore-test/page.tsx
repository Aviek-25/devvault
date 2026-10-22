"use client";

import { useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function FirestoreTestPage() {
  const [status, setStatus] = useState("Ready to test Firestore.");
  const [loading, setLoading] = useState(false);

  async function testFirestore() {
    setLoading(true);
    setStatus("Checking authentication...");

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You are not signed in. Log in to DevVault first.");
      }

      const testRef = doc(
        db,
        "users",
        user.uid,
        "snippets",
        "devvault-connection-test",
      );
      setStatus("Writing temporary test document...");

      await setDoc(testRef, {
        title: "DevVault Firestore Connection Test",
        test: true,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      });

      setStatus("Reading test document...");

      const snapshot = await getDoc(testRef);

      if (!snapshot.exists() || snapshot.data().test !== true) {
        throw new Error("The test document could not be verified.");
      }

      setStatus("Deleting temporary test document...");

      await deleteDoc(testRef);

      setStatus(
        "SUCCESS: Firestore write, read, and delete all worked. " +
          "The temporary test document has been deleted.",
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      setStatus("TEST FAILED: " + message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-6">
      <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <p className="text-sm text-cyan-400 mb-3">DEVVAULT / FIREBASE</p>

        <h1 className="text-2xl font-semibold mb-3">
          Firestore Connection Test
        </h1>

        <p className="text-sm text-zinc-400 mb-6">
          This test temporarily writes, reads, and deletes a document under your
          own authenticated user account.
        </p>

        <button
          onClick={testFirestore}
          disabled={loading}
          className="rounded-lg bg-cyan-400 px-5 py-3 font-medium text-black disabled:opacity-50"
        >
          {loading ? "Testing..." : "Run Firestore Test"}
        </button>

        <div
          role="status"
          className="mt-6 rounded-lg border border-white/10 bg-black/30 p-4 text-sm leading-6 break-words"
        >
          {status}
        </div>

        <p className="mt-5 text-xs text-zinc-500">
          Do not share your Firebase credentials. This test does not modify your
          existing snippets.
        </p>
      </section>
    </main>
  );
}
