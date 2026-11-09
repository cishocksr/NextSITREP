package com.veteransconnect.security;

import com.veteransconnect.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static com.veteransconnect.support.SavedResourceFixtures.user;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CustomUserDetailsServiceTest {
    private final UserRepository repository = mock(UserRepository.class);
    private final CustomUserDetailsService service = new CustomUserDetailsService(repository);

    @Test
    void loadsTheStoredIdentityHashAndVeteranRole() {
        var user = user("alice@example.test");
        when(repository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        var details = service.loadUserByUsername(user.getEmail());
        assertThat(details.getUsername()).isEqualTo(user.getEmail());
        assertThat(details.getPassword()).isEqualTo(user.getPasswordHash());
        assertThat(details.getAuthorities()).extracting("authority").containsExactly("ROLE_VETERAN");
    }

    @Test
    void unknownIdentityIsRejected() {
        when(repository.findByEmail("missing@example.test")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.loadUserByUsername("missing@example.test"))
                .isInstanceOf(UsernameNotFoundException.class);
    }

    @Test
    void repositoryFailureIsNotTreatedAsAnAuthenticatedUser() {
        var failure = new DataAccessResourceFailureException("Synthetic outage");
        when(repository.findByEmail("alice@example.test")).thenThrow(failure);
        assertThatThrownBy(() -> service.loadUserByUsername("alice@example.test")).isSameAs(failure);
    }
}
