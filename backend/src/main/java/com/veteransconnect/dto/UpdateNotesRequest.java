package com.veteransconnect.dto;

import jakarta.validation.constraints.Size;

/**
 * Request body for updating a veteran's notes on a saved resource.
 */
public record UpdateNotesRequest(

        @Size(max = 5000, message = "Notes cannot exceed 5000 characters")
        String notes

) {}
