package com.veteransconnect.dto;

import jakarta.validation.constraints.Size;

/**
 * Request body for updating a veteran's notes on a saved resource.
 *
 * Notes are plain text with optional markdown formatting.
 * Sending an empty string or null clears the notes.
 *
 * Examples of how veterans might use notes:
 *   - "Called 10/15 — spoke to John, reapply in Jan"
 *   - "- Great mental health program\n- Need DD-214 to apply\n- Open M-F 8am-4pm"
 *   - "Approved for housing voucher. Follow up date: 2026-03-01"
 */
public record UpdateNotesRequest(

        // Not @NotBlank — an empty string means "clear my notes"
        @Size(max = 5000, message = "Notes cannot exceed 5000 characters")
        String notes

) {}
