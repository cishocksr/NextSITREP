package com.veteransconnect.model.enums;

import lombok.Getter;

@Getter
public enum BranchOfService {
    ARMY("Army"),
    NAVY("Navy"),
    AIR_FORCE("Air Force"),
    MARINES("Marines"),
    COAST_GUARD("Coast Guard"),
    SPACE_FORCE("Space Force");

    private final String displayName;

    BranchOfService(String displayName) {
        this.displayName = displayName;
    }

    public static BranchOfService fromDisplayName(String displayName) {
        for (BranchOfService branchOfService : values()) {
            if (branchOfService.displayName.equalsIgnoreCase(displayName)) {
                return branchOfService;
            }
        }
        throw new IllegalArgumentException("Invalid branch of service: " + displayName);
    }
}