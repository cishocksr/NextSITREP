package com.veteransconnect.model.enums;

import lombok.Getter;

/**
 * Categories of veteran resources available in the app.
 *
 * Each category maps to one or more VA facility types from the VA Facilities API.
 * The vaFacilityType field is what we send to the VA API's "type" parameter.
 *
 * Note: EDUCATION, HOUSING, and FINANCIAL_ASSISTANCE all map to "benefits"
 * because the VA handles all three through its Benefits facilities.
 * Keyword filtering is applied on top to narrow results within that type.
 */
@Getter
public enum ResourceCategory {

    HEALTHCARE("health",             "Healthcare"),
    BENEFITS("benefits",             "Benefits"),
    EDUCATION("benefits",            "Education"),
    HOUSING("benefits",              "Housing"),
    FINANCIAL_ASSISTANCE("benefits", "Financial Assistance"),
    VET_CENTER("vet_center",         "Vet Center");

    // The value sent to the VA API "type" query parameter
    private final String vaFacilityType;

    // Human-readable label for the frontend
    private final String displayName;

    ResourceCategory(String vaFacilityType, String displayName) {
        this.vaFacilityType = vaFacilityType;
        this.displayName = displayName;
    }
}
