package com.veteransconnect.config;

import com.veteransconnect.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

/** Loads real profile files and the registered preflight, without opening a database/server. */
class StartupConfigurationValidatorTest {

    @TestConfiguration(proxyBeanMethods = false)
    @Import(JwtService.class)
    static class ConfigurationUnderTest { }

    private Map<String, Object> validSettings(String profile) {
        byte[] key = new byte[32];
        new SecureRandom().nextBytes(key);
        Map<String, Object> settings = new HashMap<>();
        settings.put("spring.profiles.active", profile);
        settings.put("spring.main.banner-mode", "off");
        settings.put("JWT_SECRET", Base64.getEncoder().encodeToString(key));
        settings.put("SPRING_DATASOURCE_URL", "jdbc:postgresql://database.internal:5432/nextsitrep?sslmode=verify-full");
        settings.put("SPRING_DATASOURCE_USERNAME", "runtime_user");
        settings.put("SPRING_DATASOURCE_PASSWORD", "synthetic-password-for-config-tests");
        settings.put("CORS_ALLOWED_ORIGINS", "https://app.example.test");
        settings.put("TRUSTED_PROXY_IPS", "127.0.0.1,::1");
        return settings;
    }

    private ConfigurableApplicationContext start(Map<String, Object> settings) {
        StandardEnvironment environment = new StandardEnvironment();
        // Never consume developer credentials, profiles, or local .env files in these tests.
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().addFirst(new MapPropertySource("configuration-test", settings));
        SpringApplication application = new SpringApplication(ConfigurationUnderTest.class);
        application.setEnvironment(environment);
        application.setWebApplicationType(WebApplicationType.NONE);
        application.setLogStartupInfo(false);
        return application.run();
    }

    private Throwable fails(Map<String, Object> settings, String expectedMessage) {
        Throwable failure = catchThrowable(() -> {
            try (var ignored = start(settings)) {
                // A successful context is closed even when this assertion fails.
            }
        });
        assertThat(failure).isInstanceOf(IllegalStateException.class).hasMessageContaining(expectedMessage);
        return failure;
    }

    @ParameterizedTest
    @ValueSource(strings = {"prod", "aws-dev"})
    void deploymentProfilesShareHardenedDefaults(String profile) {
        try (var context = start(validSettings(profile))) {
            var environment = context.getEnvironment();
            assertThat(environment.getActiveProfiles()).contains(profile, "deploy").doesNotContain("local", "test");
            assertThat(environment.getProperty("security.jwt.cookie-secure")).isEqualTo("true");
            assertThat(context.getBean(JwtService.class).getExpirationMs()).isEqualTo(3_600_000L);
            assertThat(environment.getProperty("spring.flyway.enabled")).isEqualTo("true");
            assertThat(environment.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"JWT_SECRET", "SPRING_DATASOURCE_URL", "SPRING_DATASOURCE_USERNAME",
            "SPRING_DATASOURCE_PASSWORD", "CORS_ALLOWED_ORIGINS"})
    void requiredDeploymentSettingsCannotBeMissingOrBlank(String name) {
        for (String value : new String[]{null, "", " "}) {
            var settings = validSettings("prod");
            // Legacy local aliases must not supply deployed database credentials.
            settings.put("POSTGRES_HOST", "localhost");
            settings.put("POSTGRES_USER", "postgres");
            settings.put("POSTGRES_PASSWORD", "postgres");
            if (value == null) settings.remove(name); else settings.put(name, value);
            fails(settings, name + " is required");
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"invalid!base64", "c2hvcnQ=",
            "VmV0ZXJhbnNDb25uZWN0U2VjcmV0S2V5Rm9yVmV0ZXJhbnNDb25uZWN0MjAyNg=="})
    void c1SigningKeyRequirementsStillApplyAtPreflight(String key) {
        var settings = validSettings("prod");
        settings.put("JWT_SECRET", key);
        fails(settings, "JWT_SECRET must be valid Base64");
    }

    @Test
    void validationErrorsDoNotExposeRejectedValuesOrNestedParserExceptions() {
        var settings = validSettings("prod");
        settings.put("JWT_SECRET", "jwt-secret-sentinel!");
        settings.put("SPRING_DATASOURCE_URL", "jdbc:postgresql://url-user:url-password-sentinel@db/app");
        settings.put("SPRING_DATASOURCE_PASSWORD", "database-password-sentinel");
        settings.put("CORS_ALLOWED_ORIGINS", "https://origin-user:origin-password-sentinel@invalid.test/path");
        settings.put("jwt.expiration", "expiration-sentinel");
        Throwable failure = fails(settings, "values redacted");
        StringWriter trace = new StringWriter();
        failure.printStackTrace(new PrintWriter(trace));
        assertThat(trace.toString()).doesNotContain("jwt-secret-sentinel", "url-password-sentinel",
                "database-password-sentinel", "origin-password-sentinel", "expiration-sentinel");
        assertThat(failure.getCause()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "86400001", "not-a-number", "999999999999999999999"})
    void deploymentTokenLifetimeIsBounded(String expiration) {
        var settings = validSettings("prod");
        settings.put("jwt.expiration", expiration);
        fails(settings, "JWT_EXPIRATION must be a positive integer");
    }

    @ParameterizedTest
    @ValueSource(strings = {"false", "", "yes"})
    void deploymentsCannotDisableSecureCookies(String secure) {
        var settings = validSettings("aws-dev");
        settings.put("security.jwt.cookie-secure", secure);
        fails(settings, "JWT_COOKIE_SECURE must be true");
    }

    @ParameterizedTest
    @ValueSource(strings = {"Lax", "Strict", "None"})
    void secureDeploymentAcceptsSupportedSameSiteSettings(String sameSite) {
        var settings = validSettings("prod");
        settings.put("security.jwt.cookie-same-site", sameSite);
        try (var context = start(settings)) {
            assertThat(context.isActive()).isTrue();
        }
    }

    @ParameterizedTest
    @CsvSource({"security.jwt.cookie-same-site,Invalid,JWT_COOKIE_SAME_SITE",
            "security.jwt.cookie-name,invalid;name,JWT_COOKIE_NAME",
            "spring.flyway.enabled,false,spring.flyway.enabled",
            "spring.flyway.clean-disabled,false,spring.flyway.clean-disabled",
            "spring.jpa.hibernate.ddl-auto,update,spring.jpa.hibernate.ddl-auto",
            "spring.jpa.show-sql,true,spring.jpa.show-sql"})
    void unsafeEffectiveOverridesAreRejected(String property, String value, String message) {
        var settings = validSettings("prod");
        settings.put(property, value);
        fails(settings, message);
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://app.example.test", "https://*.example.test", "*",
            "https://name:password@example.test", "https://app.example.test/path", "https://app.example.test/",
            "https://app.example.test?query=value", "https://app.example.test#fragment", "https://app.example.test,",
            "https://app.example.test:0", "https://app.example.test:65536", "malformed origin"})
    void deploymentsRequireExactHttpsCorsOrigins(String origin) {
        var settings = validSettings("prod");
        settings.put("CORS_ALLOWED_ORIGINS", origin);
        fails(settings, "CORS_ALLOWED_ORIGINS must contain exact HTTPS origins");
    }

    @ParameterizedTest
    @ValueSource(strings = {"jdbc:h2:mem:deployment", "jdbc:postgresql:database", "jdbc:postgresql://db/",
            "jdbc:postgresql://user:password@db/app", "jdbc:postgresql://db/app?user=somebody",
            "jdbc:postgresql://db/app?%70assword=secret", "jdbc:postgresql://db/app?password=%",
            "jdbc:postgresql://db:0/app", "jdbc:postgresql://db:65536/app", "jdbc:postgresql://db/app#fragment"})
    void deploymentsRequirePostgresUrlWithSeparateCredentials(String url) {
        var settings = validSettings("prod");
        settings.put("SPRING_DATASOURCE_URL", url);
        fails(settings, "SPRING_DATASOURCE_URL must be a single-host PostgreSQL JDBC URL");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "dev", "unknown", "prod,local", "aws-dev,test", "prod,aws-dev", "test,local",
            "local,deploy", "deploy", "prod,dev"})
    void missingUnknownOrMixedEnvironmentProfilesFail(String profiles) {
        fails(validSettings(profiles), "Invalid environment profiles");
    }

    @Test
    void deploymentGroupCannotBeOverriddenToSkipHardening() {
        var settings = validSettings("prod");
        settings.put("spring.profiles.group.prod", "other");
        fails(settings, "must include their deploy profile group");
    }

    @Test
    void localDevelopmentRetainsExplicitlyActivatedLocalDefaultsAndStillRequiresJwt() {
        var settings = validSettings("local");
        settings.remove("TRUSTED_PROXY_IPS");
        settings.keySet().removeIf(key -> key.startsWith("SPRING_DATASOURCE_") || key.equals("CORS_ALLOWED_ORIGINS"));
        try (var context = start(settings)) {
            var environment = context.getEnvironment();
            assertThat(environment.getProperty("spring.datasource.url"))
                    .isEqualTo("jdbc:postgresql://localhost:5432/veteran_connection");
            assertThat(environment.getProperty("security.jwt.cookie-secure")).isEqualTo("false");
            assertThat(environment.getProperty("security.https.required")).isEqualTo("false");
            assertThat(environment.getProperty("security.proxy.trusted-ips")).isEmpty();
        }
        settings.remove("JWT_SECRET");
        fails(settings, "JWT_SECRET is required");
    }

    @Test
    void testProfileLoadsOnlyTestFixturesAndKeepsMigrationsEnabled() {
        try (var context = start(Map.of("spring.profiles.active", "test", "spring.main.banner-mode", "off"))) {
            var environment = context.getEnvironment();
            assertThat(environment.getProperty("spring.datasource.url")).startsWith("jdbc:h2:mem:");
            assertThat(environment.getProperty("spring.flyway.enabled")).isEqualTo("true");
            assertThat(environment.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
            assertThat(environment.getProperty("spring.autoconfigure.exclude")).isNull();
            assertThat(context.getBean(JwtService.class)).isNotNull();
        }
    }

    @ParameterizedTest
    @CsvSource({"security.jwt.cookie-same-site,None,JWT_COOKIE_SAME_SITE",
            "security.jwt.cookie-name,__Host-session,JWT_COOKIE_NAME"})
    void localHttpCannotUseCookieSettingsThatRequireSecure(String property, String value, String message) {
        var settings = validSettings("local");
        settings.put(property, value);
        fails(settings, message);
    }
    @ParameterizedTest
    @ValueSource(strings = {"", " ", "localhost", "127.0.0.0/8", ".*", "0.0.0.0", "::",
            "999.0.0.1", "127.0.0.1,", "127.0.0.1|192.0.2.1", "::not-an-ip"})
    void deployedProxyTrustMustBeAnExplicitLiteralPeerList(String peers) {
        var settings = validSettings("prod");
        settings.put("TRUSTED_PROXY_IPS", peers);
        fails(settings, "TRUSTED_PROXY_IPS");
    }

    @ParameterizedTest
    @CsvSource({"server.forward-headers-strategy,framework,server.forward-headers-strategy",
            "server.forward-headers-strategy,native,server.forward-headers-strategy",
            "security.auth-rate-limit.trust-forwarded-headers,true,AUTH_RATE_LIMIT_TRUST_FORWARDED_HEADERS",
            "security.https.required,false,security.https.required",
            "security.https.required,invalid,security.https.required"})
    void broadForwardingAndDisablingHttpsCannotOverrideDeployedGuards(String property, String value, String message) {
        var settings = validSettings("aws-dev");
        settings.put(property, value);
        fails(settings, message);
    }

}
