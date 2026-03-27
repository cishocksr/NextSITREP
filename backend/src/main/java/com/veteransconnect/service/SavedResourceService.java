package com.veteransconnect.service;

import com.veteransconnect.dto.SaveResourceRequest;
import com.veteransconnect.dto.SavedResourceResponse;

import java.util.List;
import java.util.UUID;

/**
 * Manages a veteran's personal resource library.
 * All operations are scoped to the authenticated user identified by email.
 */
public interface SavedResourceService {

    /** Save a resource to the veteran's library. Returns the saved resource. */
    SavedResourceResponse saveResource(String userEmail, SaveResourceRequest request);

    /** Get all resources saved by this veteran, newest first. */
    List<SavedResourceResponse> getSavedResources(String userEmail);

    /** Update the veteran's notes on a specific saved resource. */
    SavedResourceResponse updateNotes(String userEmail, UUID savedResourceId, String notes);

    /** Remove a resource from the veteran's library. */
    void unsaveResource(String userEmail, UUID savedResourceId);
}
