"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { resourceApi } from "@/lib/api";
import type { SavedResourceResponse } from "@/lib/types";

interface NotesModalProps {
  resource: SavedResourceResponse;
  onClose: () => void;
  onUpdated: (updated: SavedResourceResponse) => void;
}

export function NotesModal({ resource, onClose, onUpdated }: NotesModalProps) {
  const [notes, setNotes] = useState(resource.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on open
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await resourceApi.updateNotes(resource.id, { notes });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notes.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default"
        onClick={onClose}
        aria-label="Close notes modal"
      />
      <div
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-6 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <h2
              id="notes-modal-title"
              className="font-semibold text-slate-900 leading-snug line-clamp-2"
            >
              Notes — {resource.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Supports plain text, bullet points (- or •), and markdown
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors text-lg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
          {error && (
            <Alert
              variant="error"
              message={error}
              onDismiss={() => setError(null)}
            />
          )}
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={5000}
            rows={12}
            placeholder={
              "Add your notes here...\n\nYou can use:\n- Bullet points\n- Plain text\n- Markdown formatting\n\nFor example:\n- Call to schedule appointment\n- Ask about PACT Act eligibility\n- Bring DD-214 form"
            }
            className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono leading-relaxed"
          />
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Tip: Use Markdown for **bold**, _italic_, # headings</span>
            <span>{notes.length} / 5000</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={isSaving}
            onClick={handleSave}
            className="flex-1"
          >
            Save Notes
          </Button>
        </div>
      </div>
    </div>
  );
}
