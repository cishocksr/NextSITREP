package com.veteransconnect.exception;

/**
 * Thrown when a saved resource is not found or doesn't belong to the requesting user.
 * Maps to HTTP 404 Not Found in GlobalExceptionHandler.
 */
public class SavedResourceNotFoundException extends RuntimeException {
    public SavedResourceNotFoundException(String message) {
        super(message);
    }
}
