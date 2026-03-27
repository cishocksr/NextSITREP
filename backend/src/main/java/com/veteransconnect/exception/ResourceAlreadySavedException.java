package com.veteransconnect.exception;

/**
 * Thrown when a veteran tries to save a resource they've already saved.
 * Maps to HTTP 409 Conflict in GlobalExceptionHandler.
 */
public class ResourceAlreadySavedException extends RuntimeException {
    public ResourceAlreadySavedException(String message) {
        super(message);
    }
}
