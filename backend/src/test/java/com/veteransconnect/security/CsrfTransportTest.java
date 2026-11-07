package com.veteransconnect.security;

import com.veteransconnect.config.SecurityConfig;
import com.veteransconnect.dto.UserResponse;
import com.veteransconnect.model.enums.BranchOfService;
import java.util.UUID;
import static org.mockito.Mockito.when;
import com.veteransconnect.controller.AuthController;
import com.veteransconnect.service.UserService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Real production security chain; no permissive test filter chain or synthetic csrf() helper. */
@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "cors.allowed-origins=https://app.example.test",
        "security.jwt.cookie-name=vc_session",
        "security.jwt.cookie-secure=true",
        "security.jwt.cookie-same-site=Lax"
})
@ActiveProfiles("test")
class CsrfTransportTest {
    @Autowired private MockMvc mvc;
    @MockitoBean private UserService userService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;
    @MockitoBean private AuthenticationManager authenticationManager;
    @MockitoBean private AuthRateLimiter authRateLimiter;

    private Cookie bootstrap() throws Exception {
        var response = mvc.perform(get("/api/v1/auth/csrf").secure(true)
                        .header(HttpHeaders.ORIGIN, "https://app.example.test"))
                .andExpect(status().isNoContent()).andReturn().getResponse();
        Cookie cookie = response.getCookie("XSRF-TOKEN");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getDomain()).isNull();
        assertThat(cookie.getPath()).isEqualTo("/");
        assertThat(cookie.isHttpOnly()).isFalse();
        assertThat(cookie.getSecure()).isTrue();
        return cookie;
    }

    @Test
    void loginIssuesSecureHttpOnlyHostOnlySessionCookie() throws Exception {
        var user = org.springframework.security.core.userdetails.User.withUsername("test@example.invalid")
                .password("unused").roles("VETERAN").build();
        when(userDetailsService.loadUserByUsername(user.getUsername())).thenReturn(user);
        when(jwtService.generateToken(user)).thenReturn("synthetic-session");
        when(jwtService.getExpirationMs()).thenReturn(3_600_000L);
        when(userService.getUserByEmail(user.getUsername())).thenReturn(new UserResponse(
                UUID.randomUUID(), user.getUsername(), "Test", "User", BranchOfService.ARMY,
                "12345", null, null));
        Cookie csrf = bootstrap();
        var response = mvc.perform(post("/api/v1/auth/login").secure(true)
                        .header(HttpHeaders.ORIGIN, "https://app.example.test")
                        .cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue())
                        .contentType("application/json")
                        .content("{\"email\":\"test@example.invalid\",\"password\":\"SyntheticPass123!\"}"))
                .andExpect(status().isOk()).andReturn().getResponse();
        String session = response.getHeaders(HttpHeaders.SET_COOKIE).stream()
                .filter(cookie -> cookie.startsWith("vc_session=")).findFirst().orElseThrow();
        assertThat(session).contains("HttpOnly", "Secure", "Path=/", "Max-Age=3600", "SameSite=Lax")
                .doesNotContain("Domain=");
    }

    @Test
    void secureCookiePolicyAppliesEvenWhenTlsTerminatesBeforeSpring() throws Exception {
        var response = mvc.perform(get("/api/v1/auth/csrf").secure(false)
                        .header(HttpHeaders.ORIGIN, "https://app.example.test"))
                .andExpect(status().isNoContent()).andReturn().getResponse();
        assertThat(response.getCookie("XSRF-TOKEN").getSecure()).isTrue();
    }

    @Test
    void bootstrapCookieAndMatchingHeaderAllowLogoutAndClearSessionCookie() throws Exception {
        Cookie csrf = bootstrap();
        var response = mvc.perform(post("/api/v1/auth/logout").secure(true)
                        .header(HttpHeaders.ORIGIN, "https://app.example.test")
                        .cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue()))
                .andExpect(status().isNoContent()).andReturn().getResponse();
        assertThat(response.getHeader(HttpHeaders.SET_COOKIE))
                .contains("vc_session=", "Max-Age=0", "HttpOnly", "Secure", "SameSite=Lax");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "incorrect-token"})
    void missingOrIncorrectHeaderIsRejectedEvenWithCookie(String header) throws Exception {
        var request = post("/api/v1/auth/logout").secure(true).cookie(bootstrap());
        if (!header.isEmpty()) request.header("X-XSRF-TOKEN", header);
        mvc.perform(request).andExpect(status().isForbidden());
    }

    @Test
    void headerWithoutCookieIsRejected() throws Exception {
        mvc.perform(post("/api/v1/auth/logout").secure(true)
                        .header("X-XSRF-TOKEN", "not-backed-by-cookie"))
                .andExpect(status().isForbidden());
    }

    @Test
    void unapprovedOriginIsRejectedEvenWithMatchingCsrfToken() throws Exception {
        Cookie csrf = bootstrap();
        mvc.perform(post("/api/v1/auth/logout").secure(true)
                        .header(HttpHeaders.ORIGIN, "https://unapproved.example.test")
                        .cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue()))
                .andExpect(status().isForbidden());
    }
}
