package com.veteransconnect.controller;

import com.veteransconnect.dto.ResourceSearchResult;
import com.veteransconnect.dto.SaveResourceRequest;
import com.veteransconnect.dto.SavedResourceResponse;
import com.veteransconnect.dto.UpdateNotesRequest;
import com.veteransconnect.model.enums.ResourceCategory;
import com.veteransconnect.service.ResourceSearchService;
import com.veteransconnect.service.SavedResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Handles all resource-related endpoints.
 *
 * Search:
 *   GET  /api/v1/resources/search         — search external APIs by location + filters
 *
 * Personal library (requires JWT — veteran sees only their own saved resources):
 *   GET    /api/v1/resources/saved         — list all saved resources
 *   POST   /api/v1/resources/saved         — save a resource
 *   PATCH  /api/v1/resources/saved/{id}/notes — update notes on a saved resource
 *   DELETE /api/v1/resources/saved/{id}   — remove a resource from saved list
 *
 * @AuthenticationPrincipal UserDetails userDetails
 *   Spring Security injects the authenticated user directly into our method.
 *   userDetails.getUsername() returns the email stored in the JWT —
 *   no need to query the database just to find out who's calling.
 */
@RestController
@RequestMapping("/api/v1/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceSearchService resourceSearchService;
    private final SavedResourceService savedResourceService;

    // =========================================================
    // SEARCH
    // =========================================================

    /**
     * Search for veteran resources near a zip code.
     *
     * All parameters except zipCode are optional:
     *   - category filters by resource type (HEALTHCARE, BENEFITS, etc.)
     *   - keyword filters by text in name/description
     *   - radius controls how many miles to search (default 50)
     *
     * Results include an "isSaved" flag so the frontend can show
     * a bookmark icon on resources the veteran has already saved.
     *
     * Example: GET /api/v1/resources/search?zipCode=90210&category=HEALTHCARE&keyword=mental+health
     */
    @GetMapping("/search")
    public ResponseEntity<List<ResourceSearchResult>> searchResources(
            @RequestParam String zipCode,
            @RequestParam(required = false) ResourceCategory category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer radius,
            @AuthenticationPrincipal UserDetails userDetails) {

        List<ResourceSearchResult> results = resourceSearchService.search(
                zipCode,
                category,
                keyword,
                radius,
                userDetails.getUsername()   // email from JWT
        );

        return ResponseEntity.ok(results);
    }

    // =========================================================
    // SAVED RESOURCES — personal library
    // =========================================================

    /**
     * Get all resources the authenticated veteran has saved, newest first.
     */
    @GetMapping("/saved")
    public ResponseEntity<List<SavedResourceResponse>> getSavedResources(
            @AuthenticationPrincipal UserDetails userDetails) {

        List<SavedResourceResponse> saved =
                savedResourceService.getSavedResources(userDetails.getUsername());

        return ResponseEntity.ok(saved);
    }

    /**
     * Save a resource to the veteran's personal library.
     * The request body contains a snapshot of the resource data from the search result
     * so it's viewable offline if the external API changes.
     *
     * Returns 409 Conflict if the veteran has already saved this resource.
     */
    @PostMapping("/saved")
    public ResponseEntity<SavedResourceResponse> saveResource(
            @Valid @RequestBody SaveResourceRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        SavedResourceResponse saved =
                savedResourceService.saveResource(userDetails.getUsername(), request);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Update the veteran's personal notes on a saved resource.
     *
     * Notes support plain text with optional markdown formatting:
     *   - Bullet points: "- item one\n- item two"
     *   - Bold: "**important**"
     *   - Line breaks: "\n"
     *
     * Send an empty string to clear notes.
     * Returns 404 if the saved resource doesn't exist or belongs to another user.
     */
    @PatchMapping("/saved/{id}/notes")
    public ResponseEntity<SavedResourceResponse> updateNotes(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateNotesRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        SavedResourceResponse updated =
                savedResourceService.updateNotes(userDetails.getUsername(), id, request.notes());

        return ResponseEntity.ok(updated);
    }

    /**
     * Remove a resource from the veteran's saved library.
     * Returns 204 No Content on success (nothing to return — it's gone).
     * Returns 404 if the saved resource doesn't exist or belongs to another user.
     */
    @DeleteMapping("/saved/{id}")
    public ResponseEntity<Void> unsaveResource(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {

        savedResourceService.unsaveResource(userDetails.getUsername(), id);

        // 204 No Content is the correct response for a successful DELETE
        return ResponseEntity.noContent().build();
    }
}
