package com.veteransconnect.model.enums;

import lombok.Getter;

/**
 * Categories of veteran resources available in the app.
 */
@Getter
public enum ResourceCategory {

    HEALTHCARE("health",             "Healthcare"),
    BENEFITS("benefits",             "Benefits"),
    EDUCATION("benefits",            "Education"),
    HOUSING("benefits",              "Housing"),
    FINANCIAL_ASSISTANCE("benefits", "Financial Assistance"),
    VET_CENTER("vet_center",         "Vet Center");

    private final String vaFacilityType;

    private final String displayName;

    ResourceCategory(String vaFacilityType, String displayName) {
        this.vaFacilityType = vaFacilityType;
        this.displayName = displayName;
    }
}
