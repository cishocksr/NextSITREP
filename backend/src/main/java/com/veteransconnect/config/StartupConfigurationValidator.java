package com.veteransconnect.config;

import com.veteransconnect.security.JwtService;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

/** Validates effective configuration before Spring creates infrastructure beans. */
public final class StartupConfigurationValidator implements EnvironmentPostProcessor, Ordered {

    private static final Set<String> ENVIRONMENTS = Set.of("local", "test", "aws-dev", "prod");
    private static final long MAX_DEPLOYED_JWT_MS = 86_400_000L;

    @Override
    public int getOrder() {
        return ConfigDataEnvironmentPostProcessor.ORDER + 1;
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Set<String> profiles = Set.copyOf(Arrays.asList(environment.getActiveProfiles()));
        boolean deployed = profiles.contains("aws-dev") || profiles.contains("prod");
        long selected = profiles.stream().filter(ENVIRONMENTS::contains).count();
        if (selected != 1 || profiles.contains("dev")
                || (profiles.contains("deploy") && !deployed) || (deployed && !profiles.contains("deploy"))) {
            throw new IllegalStateException("Invalid environment profiles: set SPRING_PROFILES_ACTIVE to exactly "
                    + "one of local, test, aws-dev, prod. Do not mix local/test with deployment profiles; "
                    + "aws-dev and prod must include their deploy profile group.");
        }
        if (profiles.contains("test")
                && getClass().getClassLoader().getResource("application-test.properties") == null) {
            throw new IllegalStateException("The test profile requires test-classpath configuration "
                    + "and cannot be used in the packaged application; use aws-dev or prod for deployments.");
        }

        List<String> errors = new ArrayList<>();
        if (!profiles.contains("test")) {
            String url = required(environment, "spring.datasource.url", "SPRING_DATASOURCE_URL", errors);
            if (url != null && !isPostgresUrl(url)) {
                errors.add("SPRING_DATASOURCE_URL must be a single-host PostgreSQL JDBC URL with a database name "
                        + "and no embedded user/password; supply credentials separately");
            }
            required(environment, "spring.datasource.username", "SPRING_DATASOURCE_USERNAME", errors);
            required(environment, "spring.datasource.password", "SPRING_DATASOURCE_PASSWORD", errors);
        }

        String secret = required(environment, "jwt.secret", "JWT_SECRET", errors);
        if (secret != null) {
            try {
                JwtService.validateSigningKey(secret);
            } catch (IllegalArgumentException ignored) {
                // Do not attach decoder/binder causes or echo rejected values.
                errors.add("JWT_SECRET must be valid Base64, decode to at least 32 bytes, "
                        + "and must not be the publicly known legacy signing key");
            }
        }

        try {
            long expiration = Long.parseLong(value(environment, "jwt.expiration"));
            if (expiration <= 0 || (deployed && expiration > MAX_DEPLOYED_JWT_MS)) {
                throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException ignored) {
            errors.add("JWT_EXPIRATION must be a positive integer in milliseconds"
                    + (deployed ? " no greater than 86400000 for deployments" : ""));
        }

        String secure = value(environment, "security.jwt.cookie-secure");
        boolean secureCookies = "true".equalsIgnoreCase(secure);
        if ((!secureCookies && !"false".equalsIgnoreCase(secure)) || (deployed && !secureCookies)) {
            errors.add("JWT_COOKIE_SECURE must be true for aws-dev/prod (only true/false are valid)");
        }
        String sameSite = value(environment, "security.jwt.cookie-same-site");
        if (!Set.of("Lax", "Strict", "None").contains(sameSite) || ("None".equals(sameSite) && !secureCookies)) {
            errors.add("JWT_COOKIE_SAME_SITE must be Lax, Strict, or None; None requires JWT_COOKIE_SECURE=true");
        }
        String cookieName = value(environment, "security.jwt.cookie-name");
        if (!cookieName.matches("[!#$%&'*+.^_`|~0-9A-Za-z-]+")
                || ((cookieName.startsWith("__Host-") || cookieName.startsWith("__Secure-")) && !secureCookies)) {
            errors.add("JWT_COOKIE_NAME must be a valid cookie name; __Host-/__Secure- names require Secure");
        }

        String origins = required(environment, "cors.allowed-origins", "CORS_ALLOWED_ORIGINS", errors);
        if (origins != null && Arrays.stream(origins.split(",", -1))
                .anyMatch(origin -> !isBrowserOrigin(origin.trim(), deployed))) {
            errors.add("CORS_ALLOWED_ORIGINS must contain exact " + (deployed ? "HTTPS" : "HTTP(S)")
                    + " origins without wildcards, credentials, paths, queries, or fragments");
        }
        if (!"true".equalsIgnoreCase(value(environment, "spring.flyway.enabled"))) {
            errors.add("spring.flyway.enabled must remain true");
        }
        if (!"true".equalsIgnoreCase(value(environment, "spring.flyway.clean-disabled"))) {
            errors.add("spring.flyway.clean-disabled must remain true");
        }
        if (!"validate".equals(value(environment, "spring.jpa.hibernate.ddl-auto"))) {
            errors.add("spring.jpa.hibernate.ddl-auto must remain validate");
        }
        if (deployed && !"false".equalsIgnoreCase(value(environment, "spring.jpa.show-sql"))) {
            errors.add("spring.jpa.show-sql must be false for aws-dev/prod");
        }
        if (!"none".equalsIgnoreCase(value(environment, "server.forward-headers-strategy"))) {
            errors.add("server.forward-headers-strategy must remain none; use the explicit trusted proxy IP list");
        }
        if (!"false".equalsIgnoreCase(value(environment, "security.auth-rate-limit.trust-forwarded-headers"))) {
            errors.add("AUTH_RATE_LIMIT_TRUST_FORWARDED_HEADERS must remain false; raw header trust is not supported");
        }
        String trustedIps = value(environment, "security.proxy.trusted-ips");
        if (deployed && trustedIps.isBlank()) {
            errors.add("TRUSTED_PROXY_IPS is required for aws-dev/prod and must identify controlled ingress peers");
        }
        try {
            TrustedProxyConfiguration.internalProxyPattern(trustedIps);
        } catch (IllegalArgumentException ignored) {
            errors.add("TRUSTED_PROXY_IPS must contain exact literal IP addresses, not hostnames, CIDRs, or regexes");
        }
        String requireHttps = value(environment, "security.https.required");
        if ((!"true".equalsIgnoreCase(requireHttps) && !"false".equalsIgnoreCase(requireHttps))
                || (deployed && !"true".equalsIgnoreCase(requireHttps))) {
            errors.add("security.https.required must be true for aws-dev/prod (only true/false are valid)");
        }
        if (!errors.isEmpty()) {
            throw new IllegalStateException("Invalid startup configuration (values redacted): " + String.join("; ", errors));
        }
    }

    private static String required(ConfigurableEnvironment environment, String property, String name, List<String> errors) {
        String result = value(environment, property);
        if (result.isBlank()) {
            errors.add(name + " is required and must not be blank");
            return null;
        }
        return result;
    }

    private static String value(ConfigurableEnvironment environment, String property) {
        try {
            return environment.getProperty(property, "");
        } catch (IllegalArgumentException ignored) {
            // Unresolved placeholders can include sensitive configuration; discard the cause.
            return "";
        }
    }

    private static boolean isPostgresUrl(String value) {
        if (!value.startsWith("jdbc:postgresql://")) return false;
        try {
            URI uri = URI.create(value.substring("jdbc:".length()));
            if (uri.getHost() == null || uri.getUserInfo() != null || uri.getFragment() != null
                    || uri.getPort() == 0 || uri.getPort() > 65535
                    || uri.getPath() == null || uri.getPath().length() < 2) return false;
            if (uri.getRawQuery() != null) {
                for (String parameter : uri.getRawQuery().split("&")) {
                    String name = URLDecoder.decode(parameter.split("=", 2)[0], StandardCharsets.UTF_8);
                    if ("user".equalsIgnoreCase(name) || "password".equalsIgnoreCase(name)) return false;
                }
            }
            return true;
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }

    private static boolean isBrowserOrigin(String value, boolean deployed) {
        try {
            URI uri = URI.create(value);
            return ("https".equals(uri.getScheme()) || (!deployed && "http".equals(uri.getScheme())))
                    && uri.getHost() != null && uri.getUserInfo() == null
                    && uri.getPort() != 0 && uri.getPort() <= 65535
                    && (uri.getRawPath() == null || uri.getRawPath().isEmpty())
                    && uri.getRawQuery() == null && uri.getFragment() == null;
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }
}
