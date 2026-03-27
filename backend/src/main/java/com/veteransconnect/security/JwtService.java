package com.veteransconnect.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Service responsible for all JWT operations:
 *   - Generating tokens after successful login/register
 *   - Extracting claims (data stored inside the token)
 *   - Validating tokens on incoming requests
 *
 * A JWT has three Base64-encoded parts separated by dots:
 *   HEADER.PAYLOAD.SIGNATURE
 *
 * Header:    algorithm used to sign ("HS256") and token type ("JWT")
 * Payload:   "claims" — data we embed (user email, issued-at, expiry)
 * Signature: HMAC-SHA256(header + payload, secretKey) — prevents tampering
 *
 * The secret key lives in application.properties and should be changed
 * to a strong random value before going to production.
 */
@Service
public class JwtService {

    // Injected from application.properties — the base64-encoded signing secret.
    // @Value("${...}") is Spring's way of reading a property into a field.
    @Value("${jwt.secret}")
    private String secretKey;

    // How long a token lives, in milliseconds. Injected from application.properties.
    // Default: 86400000 ms = 24 hours.
    @Value("${jwt.expiration}")
    private long jwtExpiration;

    // =========================================================
    // PUBLIC API
    // =========================================================

    /**
     * Generate a JWT for the given user with no extra claims.
     * The subject (the "who") is set to the user's email address.
     */
    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    /**
     * Generate a JWT with additional custom claims beyond the standard ones.
     * extraClaims can carry any data you want embedded in the token
     * (e.g. roles, userId, etc.) — but keep it small since it's in every request.
     */
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return Jwts.builder()
                // Any extra data we want to embed (can be empty map)
                .claims(extraClaims)
                // The "subject" — who this token is for. We use email as the identifier.
                .subject(userDetails.getUsername())
                // When was this token issued?
                .issuedAt(new Date(System.currentTimeMillis()))
                // When does this token expire? (issued-at + lifetime)
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                // Sign the token with our HMAC-SHA256 key. This creates the signature
                // that proves we issued the token and it hasn't been tampered with.
                .signWith(getSigningKey())
                // Serialize everything to the compact "HEADER.PAYLOAD.SIGNATURE" string
                .compact();
    }

    /**
     * Extract the username (email) from a JWT.
     * The subject claim is standard JWT shorthand for "who this token is for".
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Return the raw token expiration time in milliseconds.
     * Used by AuthResponse so the frontend knows when to refresh.
     */
    public long getExpirationMs() {
        return jwtExpiration;
    }

    /**
     * Check if the token is valid:
     *   1. The username embedded in the token matches the given UserDetails
     *   2. The token has not expired
     *
     * @param token       the JWT from the Authorization header
     * @param userDetails the user loaded from the database
     * @return true if the token is valid and belongs to this user
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    // =========================================================
    // PRIVATE HELPERS
    // =========================================================

    /**
     * Generic claim extractor.
     * claimsResolver is a function that picks one value out of the Claims object.
     * Example: Claims::getSubject, Claims::getExpiration
     *
     * Using generics here means we can extract ANY claim type without
     * writing a separate method for each one.
     */
    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Parse the JWT and return ALL claims inside it.
     * This is where the signature is verified — if the token has been tampered with,
     * or signed with a different key, JJWT throws an exception here.
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                // Tell JJWT which key to use for signature verification
                .verifyWith(getSigningKey())
                .build()
                // Parse the compact string — throws if signature is invalid or token is malformed
                .parseSignedClaims(token)
                // The "payload" is the Claims object containing all embedded data
                .getPayload();
    }

    /**
     * Check if the token's expiration timestamp is in the past.
     */
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    /**
     * Extract just the expiration Date from the token's claims.
     */
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Build the HMAC-SHA256 signing key from our base64-encoded secret.
     *
     * HMAC-SHA256 requires a key of at least 256 bits (32 bytes).
     * Decoders.BASE64.decode() converts the base64 string to raw bytes.
     * Keys.hmacShaKeyFor() wraps those bytes in a SecretKey object JJWT understands.
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
