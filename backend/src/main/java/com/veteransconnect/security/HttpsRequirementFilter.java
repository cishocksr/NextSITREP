package com.veteransconnect.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/** Fail closed, without redirecting API writes or using a client-controlled Host. */
public final class HttpsRequirementFilter extends OncePerRequestFilter {
    private final boolean required;

    public HttpsRequirementFilter(boolean required) {
        this.required = required;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (required && !request.isSecure() && !"/actuator/health".equals(request.getRequestURI())) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"HTTPS is required\",\"status\":403}");
            return;
        }
        chain.doFilter(request, response);
    }
}
