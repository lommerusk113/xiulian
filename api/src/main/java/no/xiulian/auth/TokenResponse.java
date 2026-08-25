package no.xiulian.auth;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record TokenResponse(String token) {
}
