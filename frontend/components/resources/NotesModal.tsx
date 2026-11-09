"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const hintId = useId();
  const pointerStartedOutside = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialNotes = useRef(resource.notes ?? "");
  const mounted = useRef(true);
  const saving = useRef(false);
  const requestClose = useCallback(() => {
    if (saving.current) return;
    if (
      notes !== initialNotes.current &&
      !window.confirm("Discard your unsaved notes?")
    )
      return;
    onClose();
  }, [notes, onClose]);

  useEffect(() => {
    mounted.current = true;
    const opener = document.activeElement;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    textareaRef.current?.focus();
    return () => {
      mounted.current = false;
      dialog?.close();
      if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        !document.querySelector("dialog[open]")
      )
        opener.focus();
    };
  }, []);

  function isBackdrop(event: React.MouseEvent<HTMLDialogElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return (
      event.target === event.currentTarget &&
      (event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom)
    );
  }

  async function handleSave() {
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await resourceApi.updateNotes(resource.id, { notes });
      if (!mounted.current) return;
      onUpdated(updated);
      onClose();
    } catch (err) {
      if (mounted.current)
        setError(err instanceof Error ? err.message : "Failed to save notes.");
    } finally {
      saving.current = false;
      if (mounted.current) setIsSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="notes-dialog overflow-y-auto m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border-0 bg-white p-0 shadow-2xl"
      aria-labelledby={titleId}
      aria-modal="true"
      onKeyDown={(event) => {
        if (
          event.key !== "Tab" ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>("*"),
        ).filter(
          (control) =>
            control.tabIndex >= 0 &&
            !control.matches(":disabled") &&
            !control.closest("[hidden], [inert]"),
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onPointerDown={(event) => {
        pointerStartedOutside.current = isBackdrop(event);
      }}
      onPointerUp={(event) => {
        if (pointerStartedOutside.current && isBackdrop(event)) requestClose();
        pointerStartedOutside.current = false;
      }}
    >
      <div className="flex flex-col">
        <div className="flex items-start justify-between gap-3 p-6 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <h2
              id={titleId}
              className="font-semibold text-slate-900 leading-snug break-words"
            >
              Notes: {resource.name}
            </h2>
            <p id={hintId} className="text-xs text-slate-600 mt-0.5">
              Notes are saved as plain text. Use line breaks or bullet
              characters to organize them.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={isSaving}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors text-lg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 min-h-0 flex-1 overflow-y-auto flex flex-col gap-4">
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
            aria-label="Resource notes"
            aria-describedby={hintId}
            readOnly={isSaving}
            onChange={(e) => {
              if (!saving.current) setNotes(e.target.value);
            }}
            maxLength={5000}
            rows={12}
            placeholder="Add notes, such as who to call or what to bring to an appointment."
            className="w-full max-h-[50dvh] resize-none rounded-lg border border-slate-500 p-3 text-sm text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono leading-relaxed"
          />
          <div className="flex flex-wrap gap-2 justify-between items-center text-xs text-slate-600">
            <span>Formatting characters are displayed as typed.</span>
            <span>{notes.length} / 5000</span>
          </div>
        </div>

        {isSaving && (
          <output className="px-6 text-sm text-slate-700">
            Saving your notes. Keep this editor open until saving finishes.
          </output>
        )}
        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-100">
          <Button
            variant="ghost"
            onClick={requestClose}
            disabled={isSaving}
            className="flex-1"
          >
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
    </dialog>
  );
}
