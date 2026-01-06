package com.veteransconnect.repository;

import com.veteransconnect.model.User;
import com.veteransconnect.model.enums.BranchOfService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    /**
     * @param email
     * @return {@link Optional<User>}
     * @author cishocksr
     * @date 2026/01/06 02:16
     */
    Optional<User> findByEmail(String email);

    /**
     *
     *
     * @param email
     * @return boolean
     */
    boolean existsByEmail(String email);

    /**
     *
     *
     * @param branch
     * @return {@link List<User>}
     */
    List<User> findByBranchOfService(BranchOfService branch);

    List<User> findByZipCode(String zipCode);

}

