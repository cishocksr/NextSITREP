package com.veteransconnect.security;

import com.veteransconnect.exception.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lightweight in-memory rate limiter for authentication endpoints.
 *
 * This is intentionally local-process only. It is enough for a small beta, and
 * can be replaced by Redis, an API gateway, or a managed WAF when the app scales.
 */
@Service
public class AuthRateLimiter {

    private final Map<String, ArrayDeque<Long>> attemptsByKey = new ConcurrentHashMap<>();
    private final Clock clock;
    private final int maxAttempts;
    private final long windowMs;

    @Autowired
    public AuthRateLimiter(
            @Value("${security.auth-rate-limit.max-attempts:10}") int maxAttempts,
            @Value("${security.auth-rate-limit.window-ms:900000}") long windowMs) {
        this(maxAttempts, windowMs, Clock.systemUTC());
    }

    AuthRateLimiter(int maxAttempts, long windowMs, Clock clock) {
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs;
        this.clock = clock;
    }

    public void checkAllowed(HttpServletRequest request, String endpoint, String email) {
        String key = endpoint + ":" + clientIp(request) + ":" + normalizeEmail(email);
        long now = clock.millis();
        long windowStart = now - windowMs;

        ArrayDeque<Long> attempts = attemptsByKey.computeIfAbsent(key, ignored -> new ArrayDeque<>());

        synchronized (attempts) {
            while (!attempts.isEmpty() && attempts.peekFirst() < windowStart) {
                attempts.removeFirst();
            }

            if (attempts.size() >= maxAttempts) {
                throw new RateLimitExceededException(
                        "Too many authentication attempts. Please wait and try again."
                );
            }

            attempts.addLast(now);
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "unknown" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
