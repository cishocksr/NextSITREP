package com.veteransconnect.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Generates and validates signed JWT session tokens.
 */
@Service
public class JwtService {

    // Publicly known legacy fallback; never accept it as an explicitly supplied key.
    private static final byte[] LEGACY_DEFAULT_KEY = Base64.getDecoder().decode(
            "VmV0ZXJhbnNDb25uZWN0U2VjcmV0S2V5Rm9yVmV0ZXJhbnNDb25uZWN0MjAyNg=="
    );

    private final SecretKey signingKey;
    private final long jwtExpiration;

    public JwtService(
            @Value("${jwt.secret:}") String secretKey,
            @Value("${jwt.expiration}") long jwtExpiration) {
        this.signingKey = validateSigningKey(secretKey);
        this.jwtExpiration = jwtExpiration;
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(signingKey)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public long getExpirationMs() {
        return jwtExpiration;
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /** Reused by startup preflight before database or web-server initialization. */
    public static SecretKey validateSigningKey(String secretKey) {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalArgumentException("JWT_SECRET is required; no default signing key is allowed");
        }

        final byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(secretKey);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("JWT_SECRET must be valid Base64", ex);
        }

        if (MessageDigest.isEqual(keyBytes, LEGACY_DEFAULT_KEY)) {
            throw new IllegalArgumentException("JWT_SECRET must not use the publicly known legacy signing key");
        }
        if (keyBytes.length < 32) {
            throw new IllegalArgumentException("JWT_SECRET must decode to at least 32 bytes (256 bits)");
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }
}
