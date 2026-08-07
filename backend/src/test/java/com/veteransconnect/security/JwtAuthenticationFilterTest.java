package com.veteransconnect.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("JWT Authentication Filter Tests")
class JwtAuthenticationFilterTest {

    @Mock private JwtService jwtService;
    @Mock private UserDetailsService userDetailsService;
    @Mock private FilterChain filterChain;

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtService, userDetailsService);
        ReflectionTestUtils.setField(filter, "jwtCookieName", "vc_session");
    }

    @Test
    @DisplayName("Should allow login endpoint even when stale token cookie is present")
    void shouldAllowLoginEndpointWithStaleTokenCookie() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.setServletPath("/api/v1/auth/login");
        request.setCookies(new Cookie("vc_session", "stale.jwt.token"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        verifyNoInteractions(jwtService, userDetailsService);
        verify(filterChain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
    }

    @Test
    @DisplayName("Should reject protected endpoints when stale token cookie is present")
    void shouldRejectProtectedEndpointWithStaleTokenCookie() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/resources/saved");
        request.setServletPath("/api/v1/resources/saved");
        request.setCookies(new Cookie("vc_session", "stale.jwt.token"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtService.extractUsername("stale.jwt.token"))
                .thenThrow(new JwtException("bad token"));

        filter.doFilter(request, response, filterChain);

        verifyNoInteractions(userDetailsService);
        verify(filterChain, never()).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
        assertThat(response.getContentAsString()).contains("Invalid or expired token");
    }
}
