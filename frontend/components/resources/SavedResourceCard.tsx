"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { resourceApi } from "@/lib/api";
import type { SavedResourceResponse } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/types";
import { websiteUrl } from "@/lib/website";
import { NotesModal } from "./NotesModal";

interface SavedResourceCardProps {
  resource: SavedResourceResponse;
  onRemoved: (id: string) => void;
  onUpdated: (updated: SavedResourceResponse) => void;
}

export function SavedResourceCard({
  resource,
  onRemoved,
  onUpdated,
}: SavedResourceCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showFullNotes, setShowFullNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const removing = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function handleRemove() {
    if (removing.current || showNotes) return;
    if (!confirm(`Remove "${resource.name}" from your saved resources?`))
      return;
    removing.current = true;
    setIsRemoving(true);
    setError(null);
    try {
      await resourceApi.unsave(resource.id);
      if (mounted.current) onRemoved(resource.id);
    } catch (err) {
      if (mounted.current)
        setError(
          err instanceof Error
            ? err.message
            : "Could not remove this resource. Please try again.",
        );
    } finally {
      removing.current = false;
      if (mounted.current) setIsRemoving(false);
    }
  }

  const website = websiteUrl(resource.website);

  const addressLine = [
    resource.address,
    resource.city,
    resource.state,
    resource.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  const hasNotes = resource.notes && resource.notes.trim().length > 0;
  const notesPreview = resource.notes?.slice(0, 140);
  const notesTruncated = resource.notes && resource.notes.length > 140;

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2">
              {resource.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Saved {new Date(resource.savedAt).toLocaleDateString()}
            </p>
          </div>
          <Badge className={CATEGORY_COLORS[resource.category]}>
            {CATEGORY_LABELS[resource.category]}
          </Badge>
        </div>

        {/* Description */}
        {resource.description && (
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
            {resource.description}
          </p>
        )}

        {/* Contact details */}
        <div className="flex flex-col gap-1.5 text-sm text-slate-600">
          {addressLine && (
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400" aria-hidden>
                📍
              </span>
              <span>{addressLine}</span>
            </div>
          )}
          {resource.phone && (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-slate-400" aria-hidden>
                📞
              </span>
              <a
                href={`tel:${resource.phone}`}
                className="text-blue-600 hover:underline"
              >
                {resource.phone}
              </a>
            </div>
          )}
          {website && (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-slate-400" aria-hidden>
                🌐
              </span>
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate"
              >
                Visit website
              </a>
            </div>
          )}
        </div>

        {/* Notes preview */}
        {hasNotes && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-medium text-amber-700">
                📝 Your notes
              </span>
            </div>
            <p className="text-xs text-amber-800 whitespace-pre-wrap leading-relaxed font-mono">
              {showFullNotes ? resource.notes : notesPreview}
              {notesTruncated && !showFullNotes && "…"}
            </p>
            {notesTruncated && (
              <button
                type="button"
                className="text-xs text-amber-600 hover:text-amber-700 mt-1 font-medium"
                onClick={() => setShowFullNotes(!showFullNotes)}
              >
                {showFullNotes ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}

        {error && (
          <Alert
            variant="error"
            title={`Could not remove ${resource.name}`}
            message={error}
          />
        )}
        {/* Actions */}
        <div className="flex gap-2 pt-1 mt-auto">
          <Button
            variant="secondary"
            size="sm"
            disabled={isRemoving}
            onClick={() => setShowNotes(true)}
            className="flex-1"
          >
            {hasNotes ? "Edit Notes" : "Add Notes"}
          </Button>
          <Button
            variant="dangerGhost"
            size="sm"
            isLoading={isRemoving}
            disabled={showNotes}
            onClick={handleRemove}
          >
            Remove
          </Button>
        </div>
      </div>

      {showNotes && (
        <NotesModal
          key={resource.id}
          resource={resource}
          onClose={() => setShowNotes(false)}
          onUpdated={onUpdated}
        />
      )}
    </>
  );
}
