package com.veteransconnect.repository;

import com.veteransconnect.model.User;
import com.veteransconnect.model.enums.BranchOfService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByBranchOfService(BranchOfService branch);
}
