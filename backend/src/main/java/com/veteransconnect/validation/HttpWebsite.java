package com.veteransconnect.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = HttpWebsiteValidator.class)
public @interface HttpWebsite {
    String message() default "Website must be an absolute HTTP(S) URL without credentials";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
