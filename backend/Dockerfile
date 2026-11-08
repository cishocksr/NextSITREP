# Linux ARM64 is verified as a candidate; the EC2 host decision is separate.
FROM eclipse-temurin:21.0.13_9-jdk-alpine-3.24@sha256:82801f9dcdcbad5a05082aba8c86d1da5b72ccb498e71318b1f91b5a477887b3 AS build
WORKDIR /build
COPY .mvn/wrapper/maven-wrapper.properties .mvn/wrapper/maven-wrapper.properties
COPY --chmod=0755 mvnw ./
COPY pom.xml ./
# Cold bootstrap verifies the pinned distribution checksum. No host Maven cache.
RUN command -v unzip && ./mvnw --version
COPY src ./src
# Packaging is gated by the existing tests and 70% JaCoCo check.
RUN ./mvnw clean verify -B -ntp

FROM eclipse-temurin:21.0.13_9-jre-alpine-3.24@sha256:ac05c3c42b7c2f1a52c9bd52f01041fa1958231b15ebeae7420429cbc5baf474 AS runtime
RUN addgroup -S -g 10001 app \
    && adduser -S -D -H -u 10001 -G app -s /sbin/nologin app
WORKDIR /app
COPY --from=build --chmod=0444 /build/target/backend-0.0.1-SNAPSHOT.jar ./app.jar
ENV SERVER_SHUTDOWN=graceful \
    SPRING_LIFECYCLE_TIMEOUT_PER_SHUTDOWN_PHASE=10s
USER 10001:10001
EXPOSE 8080
STOPSIGNAL SIGTERM
# Requires an external container memory limit; 60% leaves room for native memory.
ENTRYPOINT ["java", "-XX:InitialRAMPercentage=15.0", "-XX:MaxRAMPercentage=60.0", "-XX:+ExitOnOutOfMemoryError", "-Djava.io.tmpdir=/tmp", "-jar", "/app/app.jar"]
