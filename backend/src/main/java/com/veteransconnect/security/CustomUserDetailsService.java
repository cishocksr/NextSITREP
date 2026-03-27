package com.veteransconnect.security;

import com.veteransconnect.model.User;
import com.veteransconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Bridges our User entity with Spring Security's authentication system.
 *
 * Spring Security doesn't know about our User class — it works with a
 * UserDetails interface. This service is what Spring Security calls
 * when it needs to look up a user by their login identifier (email in our case).
 *
 * Flow:
 *   1. Login request comes in with email + password
 *   2. AuthenticationManager calls loadUserByUsername(email)
 *   3. We load the User from the database
 *   4. Spring Security compares the provided password against the stored BCrypt hash
 *   5. If it matches, authentication succeeds
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Load a user by their email address.
     *
     * Spring Security calls this method during authentication.
     * The "username" parameter is actually our user's email — we use email
     * as the unique login identifier instead of a traditional username.
     *
     * @param email the email address to look up (Spring passes this as "username")
     * @return a UserDetails object Spring Security can use for authentication
     * @throws UsernameNotFoundException if no user with that email exists
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "No user found with email: " + email
                ));

        // org.springframework.security.core.userdetails.User (note: NOT our User entity)
        // is a built-in Spring Security class that implements UserDetails.
        // We build it from our entity's data.
        //
        // Parameters:
        //   username  → our user's email (used as the login identifier)
        //   password  → the BCrypt hash (Spring Security will compare against this)
        //   roles     → a list of GrantedAuthority objects (empty for now — roles come in a later phase)
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPasswordHash())
                // No roles yet — we'll add ROLE_VETERAN, ROLE_ADMIN etc. in a future phase
                .roles("VETERAN")
                .build();
    }
}
