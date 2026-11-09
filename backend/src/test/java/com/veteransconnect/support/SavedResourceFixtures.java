package com.veteransconnect.support;

import com.veteransconnect.dto.SaveResourceRequest;
import com.veteransconnect.model.SavedResource;
import com.veteransconnect.model.User;
import com.veteransconnect.model.enums.BranchOfService;
import com.veteransconnect.model.enums.ResourceCategory;

/** Synthetic fixtures only; never contacts or claims verification by a provider. */
public final class SavedResourceFixtures {
    private SavedResourceFixtures() {}

    public static User user(String email) {
        return User.builder().email(email).firstName("Synthetic").lastName("Tester")
                .branchOfService(BranchOfService.ARMY).zipCode("12345")
                .passwordHash("synthetic-test-hash").build();
    }

    public static SaveResourceRequest request(String externalId, String source) {
        return new SaveResourceRequest(externalId, source, "Synthetic Resource", "Fixture description",
                ResourceCategory.HEALTHCARE, "555-0100", "https://resource.example.test",
                "1 Test Street", "Test City", "VA", "12345", "Original notes");
    }

    public static SavedResource resource(User user, String externalId, String source) {
        var request = request(externalId, source);
        return SavedResource.builder().user(user).externalId(request.externalId()).sourceApi(request.sourceApi())
                .name(request.name()).description(request.description()).category(request.category())
                .phone(request.phone()).website(request.website()).address(request.address())
                .city(request.city()).state(request.state()).zipCode(request.zipCode()).notes(request.notes()).build();
    }
}
