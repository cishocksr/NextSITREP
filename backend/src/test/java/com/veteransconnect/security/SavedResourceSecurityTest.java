package com.veteransconnect.security;

import com.jayway.jsonpath.JsonPath;
import com.veteransconnect.model.SavedResource;
import com.veteransconnect.model.User;
import com.veteransconnect.repository.SavedResourceRepository;
import com.veteransconnect.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static com.veteransconnect.support.SavedResourceFixtures.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real security chain, signed JWTs, services and migrated H2; no permissive chain. */
@SpringBootTest(properties = {
        "security.https.required=true", "security.jwt.cookie-secure=true",
        "cors.allowed-origins=https://t10.example.test"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SavedResourceSecurityTest {
    static final String BASE = "/api/v1/resources/saved";
    static final String BODY = """
            {"externalId":"posted-fixture","sourceApi":"synthetic","name":"Synthetic Resource",
             "category":"HEALTHCARE","notes":"Original notes"}
            """;
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired SavedResourceRepository resources;
    @Autowired JwtService jwt;
    @Autowired CustomUserDetailsService identities;
    User alice;
    User bob;
    SavedResource saved;
    String aliceToken;
    String bobToken;

    @BeforeEach
    void accountsAndRealSignedTokens() {
        alice = users.saveAndFlush(user("alice@example.test"));
        bob = users.saveAndFlush(user("bob@example.test"));
        saved = resources.saveAndFlush(resource(alice, "existing-fixture", "synthetic"));
        aliceToken = jwt.generateToken(identities.loadUserByUsername(alice.getEmail()));
        bobToken = jwt.generateToken(identities.loadUserByUsername(bob.getEmail()));
    }

    MockHttpServletRequestBuilder authenticated(MockHttpServletRequestBuilder request, String token) {
        return request.secure(true).header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
    }

    MockHttpServletRequestBuilder mutation(MockHttpServletRequestBuilder request, String token) throws Exception {
        var response = mvc.perform(get("/api/v1/auth/csrf").secure(true))
                .andExpect(status().isNoContent()).andReturn().getResponse();
        Cookie csrf = response.getCookie("XSRF-TOKEN");
        assertThat(csrf).isNotNull();
        assertThat(csrf.getSecure()).isTrue();
        assertThat(csrf.isHttpOnly()).isFalse();
        return authenticated(request, token).cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue());
    }

    @Test
    void completeOwnerSaveListEditDeleteFlowUsesActualServicesAndDatabase() throws Exception {
        var response = mvc.perform(mutation(post(BASE), aliceToken).contentType("application/json").content(BODY))
                .andExpect(status().isCreated()).andReturn().getResponse();
        String id = JsonPath.read(response.getContentAsString(), "$.id");
        assertThat(resources.findById(UUID.fromString(id)).orElseThrow().getUser().getId()).isEqualTo(alice.getId());
        mvc.perform(authenticated(get(BASE), bobToken)).andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(mutation(patch(BASE + "/" + id + "/notes"), aliceToken)
                .contentType("application/json").content("{\"notes\":\"edited\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.notes").value("edited"));
        assertThat(resources.findById(UUID.fromString(id)).orElseThrow().getNotes()).isEqualTo("edited");
        mvc.perform(mutation(delete(BASE + "/" + id), aliceToken)).andExpect(status().isNoContent());
        assertThat(resources.existsById(UUID.fromString(id))).isFalse();
        assertThat(users.existsById(alice.getId())).isTrue();
    }

    @Test
    void foreignAndMissingIdsAreBoth404AndForeignDataRemainsUnchanged() throws Exception {
        for (var id : java.util.List.of(saved.getId(), UUID.randomUUID())) {
            mvc.perform(mutation(patch(BASE + "/" + id + "/notes"), bobToken)
                    .contentType("application/json").content("{\"notes\":\"attack\"}"))
                    .andExpect(status().isNotFound());
            mvc.perform(mutation(delete(BASE + "/" + id), bobToken)).andExpect(status().isNotFound());
        }
        assertThat(resources.findById(saved.getId()).orElseThrow().getNotes()).isEqualTo("Original notes");
    }

    @Test
    void duplicateSaveReturns409WithoutAnAdditionalRow() throws Exception {
        mvc.perform(mutation(post(BASE), aliceToken).contentType("application/json").content(BODY)).andExpect(status().isCreated());
        var count = resources.count();
        mvc.perform(mutation(post(BASE), aliceToken).contentType("application/json").content(BODY)).andExpect(status().isConflict());
        assertThat(resources.count()).isEqualTo(count);
    }

    @ParameterizedTest
    @ValueSource(strings = {"POST", "PATCH", "DELETE"})
    void validJwtCannotBypassCsrf(String method) throws Exception {
        var request = switch (method) {
            case "POST" -> post(BASE).contentType("application/json").content(BODY);
            case "PATCH" -> patch(BASE + "/" + saved.getId() + "/notes").contentType("application/json").content("{\"notes\":\"attack\"}");
            default -> delete(BASE + "/" + saved.getId());
        };
        mvc.perform(authenticated(request, aliceToken)).andExpect(status().isForbidden());
        assertThat(resources.count()).isEqualTo(1);
        assertThat(resources.findById(saved.getId()).orElseThrow().getNotes()).isEqualTo("Original notes");
    }

    @Test
    void anonymousForgedAndUnknownAccountTokensAreRejected() throws Exception {
        mvc.perform(get(BASE).secure(true)).andExpect(status().isUnauthorized());
        mvc.perform(authenticated(get(BASE), "forged.synthetic.token")).andExpect(status().isUnauthorized());
        var unknown = org.springframework.security.core.userdetails.User.withUsername("missing@example.test")
                .password("synthetic").roles("VETERAN").build();
        mvc.perform(authenticated(get(BASE), jwt.generateToken(unknown))).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @CsvSource({"externalId", "sourceApi", "name", "category"})
    void requiredSaveFieldsAreValidatedBeforeAnyWrite(String field) throws Exception {
        var body = field.equals("category") ? BODY.replace("\"HEALTHCARE\"", "null")
                : BODY.replace(switch (field) {
                    case "externalId" -> "posted-fixture";
                    case "sourceApi" -> "synthetic";
                    default -> "Synthetic Resource";
                }, "");
        mvc.perform(mutation(post(BASE), aliceToken).contentType("application/json").content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors." + field).exists());
        assertThat(resources.count()).isEqualTo(1);
    }

    @Test
    void notesOverExistingLimitAreRejectedForSaveAndUpdate() throws Exception {
        var longNotes = "x".repeat(5001);
        mvc.perform(mutation(post(BASE), aliceToken).contentType("application/json")
                        .content(BODY.replace("Original notes", longNotes)))
                .andExpect(status().isBadRequest());
        mvc.perform(mutation(patch(BASE + "/" + saved.getId() + "/notes"), aliceToken)
                        .contentType("application/json").content("{\"notes\":\"" + longNotes + "\"}"))
                .andExpect(status().isBadRequest());
        assertThat(resources.findById(saved.getId()).orElseThrow().getNotes()).isEqualTo("Original notes");
    }

    @Test
    void malformedUuidIsRejectedAtTheHttpBoundary() throws Exception {
        mvc.perform(mutation(delete(BASE + "/not-a-uuid"), aliceToken)).andExpect(status().isBadRequest());
        mvc.perform(mutation(patch(BASE + "/not-a-uuid/notes"), aliceToken)
                .contentType("application/json").content("{\"notes\":\"edited\"}"))
                .andExpect(status().isBadRequest());
        assertThat(resources.count()).isEqualTo(1);
    }
}
