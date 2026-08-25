package no.xiulian.auth;

import at.favre.lib.crypto.bcrypt.BCrypt;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.exceptions.HttpStatusException;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.security.token.generator.AccessRefreshTokenGenerator;
import jakarta.validation.Valid;

import java.util.Locale;

@Controller("/api/auth")
@Secured(SecurityRule.IS_ANONYMOUS)
public class AuthController {

    private final UserRepository users;
    private final AccessRefreshTokenGenerator tokens;

    public AuthController(UserRepository users, AccessRefreshTokenGenerator tokens) {

        this.users = users;
        this.tokens = tokens;
    }

    @Post("/signup")
    public HttpResponse<TokenResponse> signup(@Valid @Body Credentials credentials) {

        var email = normalize(credentials.email());

        if (users.findByEmail(email).isPresent()) {
            throw new HttpStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        var hash = BCrypt.withDefaults().hashToString(12, credentials.password().toCharArray());
        var user = users.save(new UserEntity(email, hash));

        return HttpResponse.created(token(user));
    }

    @Post("/login")
    public TokenResponse login(@Body Credentials credentials) {

        var user = users.findByEmail(normalize(credentials.email()))
            .filter(u -> BCrypt.verifyer().verify(credentials.password().toCharArray(), u.getPasswordHash()).verified)
            .orElseThrow(() -> new HttpStatusException(HttpStatus.UNAUTHORIZED, "Wrong email or password"));

        return token(user);
    }

    private TokenResponse token(UserEntity user) {

        var auth = Authentication.build(user.getId().toString());

        return tokens.generate(auth)
            .map(t -> new TokenResponse(t.getAccessToken()))
            .orElseThrow();
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
