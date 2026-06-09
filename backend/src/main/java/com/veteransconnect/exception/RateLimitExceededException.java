package com.veteransconnect.exception;

/**
 * Thrown when a caller exceeds a configured request limit.
 */
public class RateLimitExceededException extends RuntimeException {

    public RateLimitExceededException(String message) {
        super(message);
    }
}
