package no.xiulian.progress;

import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Patch;
import io.micronaut.http.annotation.Status;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;

import java.util.UUID;

@Controller("/api/me/progress")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class ProgressController {

    private final ProgressService service;

    public ProgressController(ProgressService service) {
        this.service = service;
    }

    @Get
    public ProgressDto get(Authentication auth) {
        return service.get(userId(auth));
    }

    @Patch
    @Status(HttpStatus.NO_CONTENT)
    public void patch(Authentication auth, @Body ProgressDto delta) {
        service.patch(userId(auth), delta);
    }

    @Delete
    @Status(HttpStatus.NO_CONTENT)
    public void delete(Authentication auth) {
        service.delete(userId(auth));
    }

    private static UUID userId(Authentication auth) {
        return UUID.fromString(auth.getName());
    }
}
