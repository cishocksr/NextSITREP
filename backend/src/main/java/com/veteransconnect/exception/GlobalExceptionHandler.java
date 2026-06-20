package com.veteransconnect.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

// @RestControllerAdvice intercepts exceptions thrown by ANY @RestController.
// Without this, Spring would return an HTML error page or a raw 500.
// With this, we control exactly what JSON shape gets sent back to the client.
@RestControllerAdvice
public class GlobalExceptionHandler {

    // =========================================================
    // ErrorResponse — the consistent JSON shape we return for ALL errors.
    // Using a record keeps it concise. Every error response will look like:
    // { "message": "...", "status": 404, "timestamp": "..." }
    // =========================================================
    public record ErrorResponse(
            String message,
            int status,
            LocalDateTime timestamp
    ) {}

    // =========================================================
    // 404 Not Found — UserNotFoundException
    // =========================================================

    // @ExceptionHandler tells Spring: "when UserNotFoundException is thrown
    // anywhere in a @RestController, run THIS method instead of the default."
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFoundException(
            UserNotFoundException ex) {

        ErrorResponse error = new ErrorResponse(
                ex.getMessage(),
                HttpStatus.NOT_FOUND.value(),
                LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    // =========================================================
    // 409 Conflict — DuplicateEmailException
    // =========================================================

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEmailException(
            DuplicateEmailException ex) {

        ErrorResponse error = new ErrorResponse(
                ex.getMessage(),
                HttpStatus.CONFLICT.value(),
                LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    // =========================================================
    // 400 Bad Request — Bean Validation failures
    // =========================================================

    // MethodArgumentNotValidException is thrown by Spring when @Valid fails.
    // We collect ALL field errors and return them in a structured way.
    // This gives the client clear feedback: which fields failed and why.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(
            MethodArgumentNotValidException ex) {

        // Collect each field name → error message
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Validation failed");
        response.put("errors", fieldErrors);
        response.put("status", HttpStatus.BAD_REQUEST.value());
        response.put("timestamp", LocalDateTime.now());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    // =========================================================
    // 400 Bad Request — IllegalArgumentException
    // =========================================================

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex) {

        ErrorResponse error = new ErrorResponse(
                ex.getMessage(),
                HttpStatus.BAD_REQUEST.value(),
                LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // =========================================================
    // 401 Unauthorized — BadCredentialsException
    // =========================================================

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentialsException(
            BadCredentialsException ex) {

        ErrorResponse error = new ErrorResponse(
                "Invalid email or password",
                HttpStatus.UNAUTHORIZED.value(),
                LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    // =========================================================
    // 403 Forbidden — authenticated but not allowed
    // =========================================================

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException ex) {

        ErrorResponse error = new ErrorResponse(
                ex.getMessage(),
                HttpStatus.FORBIDDEN.value(),
                LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    // =========================================================
    // 404 Not Found — SavedResourceNotFoundException
    // =========================================================

    @ExceptionHandler(SavedResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleSavedResourceNotFoundException(
            SavedResourceNotFoundException ex) {

        ErrorResponse error = new ErrorResponse(
                ex.getMessage(),
                HttpStatus.NOT_FOUND.value(),
                LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    // =========================================================
    // 409 Conflict — ResourceAlreadySavedException
    // =========================================================

    @ExceptionHandler(ResourceAlreadySavedException.class)
    public ResponseEntity<ErrorResponse> handleResourceAlreadySavedException(
            ResourceAlreadySavedException ex) {

        ErrorResponse error = new ErrorResponse(
                ex.getMessage(),
                HttpStatus.CONFLICT.value(),
                LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    // =========================================================
    // 429 Too Many Requests — RateLimitExceededException
    // =========================================================

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRateLimitExceededException(
            RateLimitExceededException ex) {

        ErrorResponse error = new ErrorResponse(
                ex.getMessage(),
                HttpStatus.TOO_MANY_REQUESTS.value(),
                LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(error);
    }

    // =========================================================
    // 400 Bad Request — GeocodingException (bad zip code)
    // =========================================================

    @ExceptionHandler(com.veteransconnect.client.GeocodingService.GeocodingException.class)
    public ResponseEntity<ErrorResponse> handleGeocodingException(
            com.veteransconnect.client.GeocodingService.GeocodingException ex) {

        ErrorResponse error = new ErrorResponse(
                ex.getMessage(),
                HttpStatus.BAD_REQUEST.value(),
                LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // =========================================================
    // 503 Service Unavailable — Geocoding upstream unavailable
    // =========================================================

    @ExceptionHandler(com.veteransconnect.client.GeocodingService.GeocodingServiceUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleGeocodingServiceUnavailableException(
            com.veteransconnect.client.GeocodingService.GeocodingServiceUnavailableException ex) {

        ErrorResponse error = new ErrorResponse(
                ex.getMessage(),
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
    }

    // =========================================================
    // 503 Service Unavailable — VA Facilities unavailable or misconfigured
    // =========================================================

    @ExceptionHandler({
            com.veteransconnect.client.VaFacilitiesClient.VaFacilitiesConfigurationException.class,
            com.veteransconnect.client.VaFacilitiesClient.VaFacilitiesServiceUnavailableException.class
    })
    public ResponseEntity<ErrorResponse> handleVaFacilitiesException(RuntimeException ex) {

        ErrorResponse error = new ErrorResponse(
                ex.getMessage(),
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
    }
}
