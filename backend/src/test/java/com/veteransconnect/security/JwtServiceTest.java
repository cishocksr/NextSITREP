package com.veteransconnect.security;

import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.core.userdetails.User;

import java.security.SecureRandom;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String LEGACY_SECRET =
            "VmV0ZXJhbnNDb25uZWN0U2VjcmV0S2V5Rm9yVmV0ZXJhbnNDb25uZWN0MjAyNg==";
    private static final long EXPIRATION_MS = 60_000;
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(JwtService.class)
            .withPropertyValues("jwt.expiration=" + EXPIRATION_MS);

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t"})
    void rejectsMissingOrBlankSecret(String secret) {
        assertThatThrownBy(() -> new JwtService(secret, EXPIRATION_MS))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("JWT_SECRET is required; no default signing key is allowed");
    }

    @Test
    void rejectsMalformedBase64WithoutDisclosingSecret() {
        String secret = "invalid-secret-that-must-not-appear-in-errors!";
        assertThatThrownBy(() -> new JwtService(secret, EXPIRATION_MS))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("JWT_SECRET must be valid Base64")
                .hasMessageNotContaining(secret);
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 16, 31})
    void rejectsKeysBelowMinimumDecodedLength(int bytes) {
        assertThatThrownBy(() -> new JwtService(randomSecret(bytes), EXPIRATION_MS))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("JWT_SECRET must decode to at least 32 bytes (256 bits)");
    }

    @Test
    void rejectsExplicitLegacyKeyIncludingAlternativeBase64Padding() {
        for (String secret : new String[]{LEGACY_SECRET, LEGACY_SECRET.replace("=", "")}) {
            assertThatThrownBy(() -> new JwtService(secret, EXPIRATION_MS))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("JWT_SECRET must not use the publicly known legacy signing key");
        }
    }

    @Test
    void missingSecretPreventsSpringContextStartup() {
        contextRunner.run(context -> assertThat(context)
                .hasFailed()
                .getFailure()
                .hasRootCauseMessage("JWT_SECRET is required; no default signing key is allowed"));
    }

    @Test
    void legacyKeyPreventsProductionContextStartup() {
        contextRunner.withPropertyValues("jwt.secret=" + LEGACY_SECRET, "spring.profiles.active=prod")
                .run(context -> assertThat(context)
                        .hasFailed()
                        .getFailure()
                        .hasRootCauseMessage("JWT_SECRET must not use the publicly known legacy signing key"));
    }

    @Test
    void validKeyAllowsSpringContextStartup() {
        contextRunner.withPropertyValues("jwt.secret=" + randomSecret(32))
                .run(context -> {
                    assertThat(context).hasNotFailed().hasSingleBean(JwtService.class);
                    assertThat(context.getBean(JwtService.class).getExpirationMs()).isEqualTo(EXPIRATION_MS);
                });
    }

    @ParameterizedTest
    @ValueSource(ints = {32, 48, 64})
    void validKeysCanSignAndVerifyTokens(int bytes) {
        JwtService service = new JwtService(randomSecret(bytes), EXPIRATION_MS);
        var user = User.withUsername("test@example.invalid").password("unused").roles("VETERAN").build();

        String token = service.generateToken(user);

        assertThat(service.extractUsername(token)).isEqualTo(user.getUsername());
        assertThat(service.isTokenValid(token, user)).isTrue();
    }

    @Test
    void anotherEnvironmentsKeyCannotVerifyTheToken() {
        JwtService issuer = new JwtService(randomSecret(32), EXPIRATION_MS);
        JwtService otherEnvironment = new JwtService(randomSecret(32), EXPIRATION_MS);
        var user = User.withUsername("test@example.invalid").password("unused").roles("VETERAN").build();
        String token = issuer.generateToken(user);

        assertThatThrownBy(() -> otherEnvironment.extractUsername(token)).isInstanceOf(JwtException.class);
    }

    private static String randomSecret(int bytes) {
        byte[] key = new byte[bytes];
        new SecureRandom().nextBytes(key);
        return Base64.getEncoder().encodeToString(key);
    }
}
