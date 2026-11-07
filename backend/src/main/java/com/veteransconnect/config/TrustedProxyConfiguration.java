package com.veteransconnect.config;

import org.apache.catalina.valves.RemoteIpValve;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Pattern;

/** No implicit trust of loopback/private networks: only explicitly named socket peers. */
@Configuration(proxyBeanMethods = false)
public class TrustedProxyConfiguration {
    @Bean
    WebServerFactoryCustomizer<TomcatServletWebServerFactory> trustedProxyCustomizer(
            @Value("${security.proxy.trusted-ips:}") String trustedIps) {
        String pattern = internalProxyPattern(trustedIps);
        return factory -> {
            RemoteIpValve valve = new RemoteIpValve();
            valve.setInternalProxies(pattern);
            valve.setTrustedProxies(null);
            valve.setRemoteIpHeader("X-Forwarded-For");
            valve.setProtocolHeader("X-Forwarded-Proto");
            // Host, port, prefix, and RFC Forwarded values do not control generated URLs.
            valve.setHostHeader(null);
            valve.setPortHeader(null);
            factory.addEngineValves(valve);
        };
    }

    static String internalProxyPattern(String value) {
        if (value.isBlank()) return "a^"; // Matches no peer; local/test default.
        Set<String> ips = new LinkedHashSet<>();
        for (String entry : value.split(",", -1)) {
            String ip = entry.trim();
            // Reject hostnames before InetAddress parsing, so validation never performs DNS.
            boolean ipv4 = ip.matches("(?:[0-9]{1,3}\\.){3}[0-9]{1,3}");
            boolean ipv6 = ip.contains(":") && ip.matches("[0-9a-fA-F:.]+");
            if (!ipv4 && !ipv6) throw new IllegalArgumentException("Invalid trusted proxy IP list");
            if (ipv4) {
                for (String octet : ip.split("\\.")) {
                    if (Integer.parseInt(octet) > 255) throw new IllegalArgumentException("Invalid trusted proxy IP list");
                }
            }
            try {
                InetAddress address = InetAddress.getByName(ip);
                if (address.isAnyLocalAddress()) throw new IllegalArgumentException("Invalid trusted proxy IP list");
                ips.add(Pattern.quote(ip));
                ips.add(Pattern.quote(address.getHostAddress()));
            } catch (UnknownHostException ignored) {
                throw new IllegalArgumentException("Invalid trusted proxy IP list");
            }
        }
        return String.join("|", ips);
    }
}
