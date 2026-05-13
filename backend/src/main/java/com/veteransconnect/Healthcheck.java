package com.veteransconnect;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class Healthcheck {

    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:8080/actuator/health"))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();

        int status = client.send(request, HttpResponse.BodyHandlers.discarding())
                .statusCode();

        if (status < 200 || status >= 300) {
            System.exit(1);
        }
    }
}
