package no.xiulian.auth;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Serdeable
public record Credentials(@Email @NotBlank String email, @Size(min = 8) String password) {
}
