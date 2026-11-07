package com.veteransconnect.config;

import com.veteransconnect.controller.AuthController;
import com.veteransconnect.security.AuthRateLimiter;
import com.veteransconnect.security.JwtAuthenticationFilter;
import com.veteransconnect.security.JwtService;
import com.veteransconnect.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.health.autoconfigure.actuate.endpoint.HealthEndpointAutoConfiguration;
import org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.web.server.servlet.context.ServletWebServerApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/** Exercises the real Tomcat valve over HTTP, not MockMvc's simulated request scheme. */
class TrustedProxyIntegrationTest {
    private static ServletWebServerApplicationContext trusted;
    private static ServletWebServerApplicationContext untrusted;
    private static final HttpClient CLIENT = HttpClient.newHttpClient();

    @TestConfiguration(proxyBeanMethods = false)
    @EnableAutoConfiguration(exclude = {DataSourceAutoConfiguration.class,
            HibernateJpaAutoConfiguration.class, FlywayAutoConfiguration.class, HealthEndpointAutoConfiguration.class})
    @Import({SecurityConfig.class, TrustedProxyConfiguration.class, JwtAuthenticationFilter.class,
            AuthController.class, Probe.class})
    static class ProbeApplication {
        @Bean JwtService jwtService() { return mock(JwtService.class); }
        @Bean UserDetailsService userDetailsService() { return mock(UserDetailsService.class); }
        @Bean UserService userService() { return mock(UserService.class); }
        @Bean AuthRateLimiter authRateLimiter() { return mock(AuthRateLimiter.class); }
    }

    @RestController
    static class Probe {
        @GetMapping("/actuator/health")
        Map<String, Object> health(HttpServletRequest request, HttpServletResponse response) throws IOException {
            String headerMethod = request.getParameter("contentLengthMethod");
            if (headerMethod != null) {
                byte[] body = "{}".getBytes(StandardCharsets.UTF_8);
                response.setContentType("application/json");
                switch (headerMethod) {
                    case "setHeader" -> response.setHeader("Content-Length", Integer.toString(body.length));
                    case "setIntHeader" -> response.setIntHeader("Content-Length", body.length);
                    case "addHeader" -> response.addHeader("Content-Length", Integer.toString(body.length));
                    default -> throw new IllegalArgumentException("Unsupported test header method");
                }
                response.getOutputStream().write(body);
                response.flushBuffer();
                return null;
            }
            return Map.of("secure", request.isSecure(), "scheme", request.getScheme(),
                    "client", request.getRemoteAddr(), "host", request.getServerName());
        }
    }

    /** CVE-2026-22732: generic Content-Length setters must not commit before headers. */
    @ParameterizedTest
    @ValueSource(strings = {"setHeader", "setIntHeader", "addHeader"})
    void securityHeadersSurviveExplicitContentLengthCommit(String headerMethod) throws Exception {
        HttpResponse<String> response = send(request(trusted,
                "/actuator/health?contentLengthMethod=" + headerMethod)
                .header("X-Forwarded-Proto", "https"));
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).isEqualTo("{}");
        assertThat(response.headers().firstValue("Content-Length")).contains("2");
        assertSecurityHeaders(response);
    }

    private static ServletWebServerApplicationContext start(String trustedIps) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().addFirst(new MapPropertySource("proxy-test", Map.of(
                "spring.profiles.active", "test", "server.address", "127.0.0.1", "server.port", "0",
                "spring.main.banner-mode", "off", "security.proxy.trusted-ips", trustedIps,
                "security.https.required", "true", "security.jwt.cookie-secure", "true",
                "cors.allowed-origins", "https://app.example.test")));
        SpringApplication application = new SpringApplication(ProbeApplication.class);
        application.setEnvironment(environment);
        application.setWebApplicationType(WebApplicationType.SERVLET);
        application.setLogStartupInfo(false);
        return (ServletWebServerApplicationContext) application.run();
    }

    @BeforeAll
    static void startServers() {
        trusted = start("127.0.0.1,::1");
        untrusted = start("192.0.2.10");
    }

    @AfterAll
    static void stopServers() {
        if (trusted != null) trusted.close();
        if (untrusted != null) untrusted.close();
    }

    private HttpRequest.Builder request(ServletWebServerApplicationContext context, String path) {
        return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + context.getWebServer().getPort() + path));
    }

    private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return CLIENT.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private void assertSecurityHeaders(HttpResponse<String> response) {
        assertThat(response.headers().firstValue("X-Content-Type-Options")).contains("nosniff");
        assertThat(response.headers().firstValue("Referrer-Policy")).contains("no-referrer");
        assertThat(response.headers().firstValue("X-Frame-Options")).contains("DENY");
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        assertThat(response.headers().firstValue("Permissions-Policy"))
                .contains("camera=(), microphone=(), geolocation=()");
        assertThat(response.headers().firstValue("Content-Security-Policy"))
                .contains("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    }

    @Test
    void controlledPeerCanReportHttpsAndReceivesHostScopedHstsAndSecureCsrfCookie() throws Exception {
        var response = send(request(trusted, "/api/v1/auth/csrf")
                .header("X-Forwarded-Proto", "https").header("Origin", "https://app.example.test"));
        assertThat(response.statusCode()).isEqualTo(204);
        assertSecurityHeaders(response);
        assertThat(response.headers().firstValue("Strict-Transport-Security")).contains("max-age=31536000");
        assertThat(response.headers().firstValue("Set-Cookie").orElseThrow())
                .contains("XSRF-TOKEN=", "Path=/", "Secure").doesNotContain("HttpOnly", "Domain=");
    }

    @Test
    void unlistedPeerCannotSpoofSchemeOrClientIdentity() throws Exception {
        var response = send(request(untrusted, "/api/v1/auth/csrf")
                .header("X-Forwarded-Proto", "https").header("X-Forwarded-For", "203.0.113.99"));
        assertThat(response.statusCode()).isEqualTo(403);
        assertThat(response.body()).contains("HTTPS is required");
        assertSecurityHeaders(response);
        assertThat(response.headers().firstValue("Strict-Transport-Security")).isEmpty();
        var health = send(request(untrusted, "/actuator/health")
                .header("X-Forwarded-Proto", "https").header("X-Forwarded-For", "203.0.113.99"));
        assertThat(health.body()).contains("\"secure\":false", "\"client\":\"127.0.0.1\"");
    }

    @Test
    void nativeChainStopsAtNearestUntrustedHopAndIgnoresForwardedHost() throws Exception {
        var response = send(request(trusted, "/actuator/health")
                .header("X-Forwarded-Proto", "https")
                .header("X-Forwarded-For", "198.51.100.99, 203.0.113.42")
                .header("X-Forwarded-Host", "attacker.example.test")
                .header("Forwarded", "for=198.51.100.99;proto=http;host=attacker.example.test"));
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"secure\":true", "\"scheme\":\"https\"",
                "\"client\":\"203.0.113.42\"", "\"host\":\"127.0.0.1\"");
    }

    @Test
    void missingOrMixedSchemeCannotBypassHttpsRequirementAndRfcForwardedIsIgnored() throws Exception {
        for (String proto : new String[]{"http", "https, http"}) {
            var response = send(request(trusted, "/api/v1/auth/csrf").header("X-Forwarded-Proto", proto));
            assertThat(response.statusCode()).isEqualTo(403);
            assertThat(response.headers().firstValue("Strict-Transport-Security")).isEmpty();
        }
        var response = send(request(trusted, "/api/v1/auth/csrf")
                .header("Forwarded", "proto=https;for=203.0.113.42"));
        assertThat(response.statusCode()).isEqualTo(403);
        assertThat(response.headers().firstValue("Location")).isEmpty();
    }

    @Test
    void sharedOriginCsrfCookieHeaderHandshakeStillWorksAndMissingHeaderIsRejected() throws Exception {
        var csrf = send(request(trusted, "/api/v1/auth/csrf").header("X-Forwarded-Proto", "https"));
        String cookie = csrf.headers().firstValue("Set-Cookie").orElseThrow().split(";", 2)[0];
        String token = cookie.substring(cookie.indexOf('=') + 1);
        var logout = send(request(trusted, "/api/v1/auth/logout").header("X-Forwarded-Proto", "https")
                .header("Cookie", cookie).header("X-XSRF-TOKEN", token)
                .POST(HttpRequest.BodyPublishers.noBody()));
        assertThat(logout.statusCode()).isEqualTo(204);
        assertThat(logout.headers().firstValue("Set-Cookie").orElseThrow())
                .contains("vc_session=", "Max-Age=0", "HttpOnly", "Secure", "Path=/", "SameSite=Lax")
                .doesNotContain("Domain=");
        var rejected = send(request(trusted, "/api/v1/auth/logout").header("X-Forwarded-Proto", "https")
                .header("Cookie", cookie).POST(HttpRequest.BodyPublishers.noBody()));
        assertThat(rejected.statusCode()).isEqualTo(403);
        assertSecurityHeaders(rejected);
    }
}
