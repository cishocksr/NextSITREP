package com.veteransconnect.security;

import com.veteransconnect.exception.RateLimitExceededException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Auth Rate Limiter Tests")
class AuthRateLimiterTest {

    @Test
    @DisplayName("Should allow requests under the configured limit")
    void shouldAllowRequestsUnderLimit() {
        AuthRateLimiter limiter = new AuthRateLimiter(
                2,
                60_000,
                Clock.fixed(Instant.parse("2026-06-09T12:00:00Z"), ZoneOffset.UTC)
        );
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        assertThatCode(() -> {
            limiter.checkAllowed(request, "login", "veteran@example.com");
            limiter.checkAllowed(request, "login", "veteran@example.com");
        }).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Should reject requests over the configured limit")
    void shouldRejectRequestsOverLimit() {
        AuthRateLimiter limiter = new AuthRateLimiter(
                2,
                60_000,
                Clock.fixed(Instant.parse("2026-06-09T12:00:00Z"), ZoneOffset.UTC)
        );
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        limiter.checkAllowed(request, "login", "veteran@example.com");
        limiter.checkAllowed(request, "login", "veteran@example.com");

        assertThatThrownBy(() -> limiter.checkAllowed(request, "login", "veteran@example.com"))
                .isInstanceOf(RateLimitExceededException.class)
                .hasMessageContaining("Too many authentication attempts");
    }

    @Test
    @DisplayName("Should apply separate limits per endpoint and email")
    void shouldApplySeparateLimitsPerEndpointAndEmail() {
        AuthRateLimiter limiter = new AuthRateLimiter(
                1,
                60_000,
                Clock.fixed(Instant.parse("2026-06-09T12:00:00Z"), ZoneOffset.UTC)
        );
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        limiter.checkAllowed(request, "login", "veteran@example.com");

        assertThatCode(() -> {
            limiter.checkAllowed(request, "register", "veteran@example.com");
            limiter.checkAllowed(request, "login", "other@example.com");
        }).doesNotThrowAnyException();
    }
}
