package com.veteransconnect.repository;

import com.veteransconnect.model.SavedResource;
import com.veteransconnect.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SavedResourceRepository extends JpaRepository<SavedResource, UUID> {

    List<SavedResource> findByUserOrderBySavedAtDesc(User user);

    Optional<SavedResource> findByUserAndExternalIdAndSourceApi(
            User user, String externalId, String sourceApi);

    boolean existsByUserAndExternalIdAndSourceApi(
            User user, String externalId, String sourceApi);

    List<SavedResource> findByUser(User user);
}
