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
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

/**
 * Handles all resource-related endpoints.
 */
@RestController
@RequestMapping("/api/v1/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceSearchService resourceSearchService;
    private final SavedResourceService savedResourceService;

    @GetMapping("/search")
    public ResponseEntity<List<ResourceSearchResult>> searchResources(
            @RequestParam String zipCode,
            @RequestParam(required = false) ResourceCategory category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer radius,
            Principal principal) {

        List<ResourceSearchResult> results = resourceSearchService.search(
                zipCode,
                category,
                keyword,
                radius,
                principal.getName()
        );

        return ResponseEntity.ok(results);
    }

    @GetMapping("/saved")
    public ResponseEntity<List<SavedResourceResponse>> getSavedResources(
            Principal principal) {

        List<SavedResourceResponse> saved =
                savedResourceService.getSavedResources(principal.getName());

        return ResponseEntity.ok(saved);
    }

    @PostMapping("/saved")
    public ResponseEntity<SavedResourceResponse> saveResource(
            @Valid @RequestBody SaveResourceRequest request,
            Principal principal) {

        SavedResourceResponse saved =
                savedResourceService.saveResource(principal.getName(), request);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PatchMapping("/saved/{id}/notes")
    public ResponseEntity<SavedResourceResponse> updateNotes(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateNotesRequest request,
            Principal principal) {

        SavedResourceResponse updated =
                savedResourceService.updateNotes(principal.getName(), id, request.notes());

        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/saved/{id}")
    public ResponseEntity<Void> unsaveResource(
            @PathVariable UUID id,
            Principal principal) {

        savedResourceService.unsaveResource(principal.getName(), id);

        return ResponseEntity.noContent().build();
    }
}
