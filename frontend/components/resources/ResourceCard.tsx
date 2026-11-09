"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { resourceApi } from "@/lib/api";
import type { ResourceSearchResult } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/types";
import { websiteUrl } from "@/lib/website";

interface ResourceCardProps {
  resource: ResourceSearchResult;
  onSaved?: (result: ResourceSearchResult) => void;
}

export function ResourceCard({ resource, onSaved }: ResourceCardProps) {
  const [isSaved, setIsSaved] = useState(resource.isSaved);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (isSaved) return;
    setIsSaving(true);
    try {
      await resourceApi.save({
        externalId: resource.externalId,
        sourceApi: resource.sourceApi,
        name: resource.name,
        description: resource.description,
        category: resource.category,
        phone: resource.phone,
        website: websiteUrl(resource.website),
        address: resource.address,
        city: resource.city,
        state: resource.state,
        zipCode: resource.zipCode,
        notes: null,
      });
      setIsSaved(true);
      onSaved?.({ ...resource, isSaved: true });
    } catch (err) {
      console.error("Failed to save resource", err);
    } finally {
      setIsSaving(false);
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2">
            {resource.name}
          </h3>
          {resource.distanceMiles != null && (
            <p className="text-xs text-slate-400 mt-0.5">
              {resource.distanceMiles.toFixed(1)} mi away
            </p>
          )}
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

      {/* Details */}
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

      {/* Actions */}
      <div className="pt-1 mt-auto">
        <Button
          variant={isSaved ? "ghost" : "secondary"}
          size="sm"
          isLoading={isSaving}
          disabled={isSaved}
          onClick={handleSave}
          className="w-full"
        >
          {isSaved ? "✓ Saved" : "Save Resource"}
        </Button>
      </div>
    </div>
  );
}
