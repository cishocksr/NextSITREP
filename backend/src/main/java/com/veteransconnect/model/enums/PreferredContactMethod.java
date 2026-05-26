package com.veteransconnect.model.enums;

public enum PreferredContactMethod {
    EMAIL("Email"),
    PHONE("Phone"),
    TEXT("Text"),
    NO_PREFERENCE("No Preference")

    private final String displayName;

    PreferredContactMethod(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
    public static PreferredContactMethod frommDisplayName(String displayName) {
        for (PreferredContactMethod method: values()) {
            if(method.displayName.equalsIgnoreCase(displayName)) {
                return method;
            }
        }

        throw new IllegalArgumentException("Unknown preferred contact method: " + displayName );
    }
}
