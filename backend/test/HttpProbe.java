// T09 synthetic client only; compiled into a temporary read-only test mount.
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;

public class HttpProbe {
    public static void main(String[] args) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create(args[0])).timeout(Duration.ofSeconds(10));
        var body = Base64.getDecoder().decode(args[2]);
        for (int i = 3; i < args.length; i++) {
            var pair = args[i].split("=", 2);
            builder.header(pair[0], pair[1]);
        }
        builder.method(args[1], body.length == 0 ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofByteArray(body));
        var response = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()
            .send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
        System.out.println(response.statusCode());
        System.out.println(Base64.getEncoder().encodeToString(response.body()));
        response.headers().map().forEach((key, values) -> values.forEach(value ->
            System.out.println(key + ":" + Base64.getEncoder().encodeToString(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)))));
    }
}
