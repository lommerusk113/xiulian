package no.xiulian.auth

import io.micronaut.http.HttpRequest
import io.micronaut.http.client.HttpClient
import io.micronaut.http.client.annotation.Client
import io.micronaut.http.client.exceptions.HttpClientResponseException
import io.micronaut.test.extensions.spock.annotation.MicronautTest
import jakarta.inject.Inject
import spock.lang.Specification

import static io.micronaut.http.HttpStatus.BAD_REQUEST
import static io.micronaut.http.HttpStatus.CONFLICT
import static io.micronaut.http.HttpStatus.CREATED
import static io.micronaut.http.HttpStatus.OK
import static io.micronaut.http.HttpStatus.UNAUTHORIZED

@MicronautTest
class AuthSpec extends Specification {

    @Inject
    @Client('/')
    HttpClient http

    def 'signup returns a token'() {
        when:
            def res = http.toBlocking().exchange(HttpRequest.POST('/api/auth/signup', [email: 'new@x.no', password: 'password1']), Map)
        then:
            res.status == CREATED
            res.body().token
    }

    def 'login with the same credentials returns a token'() {
        given:
            signup('login@x.no')
        when:
            def res = http.toBlocking().exchange(HttpRequest.POST('/api/auth/login', [email: 'Login@X.no ', password: 'password1']), Map)
        then:
            res.status == OK
            res.body().token
    }

    def 'duplicate email is rejected'() {
        given:
            signup('dup@x.no')
        when:
            signup('dup@x.no')
        then:
            def e = thrown(HttpClientResponseException)
            e.status == CONFLICT
    }

    def 'wrong password is rejected'() {
        given:
            signup('wrong@x.no')
        when:
            http.toBlocking().exchange(HttpRequest.POST('/api/auth/login', [email: 'wrong@x.no', password: 'password2']), Map)
        then:
            def e = thrown(HttpClientResponseException)
            e.status == UNAUTHORIZED
    }

    def 'short password is rejected'() {
        when:
            http.toBlocking().exchange(HttpRequest.POST('/api/auth/signup', [email: 'short@x.no', password: 'short']), Map)
        then:
            def e = thrown(HttpClientResponseException)
            e.status == BAD_REQUEST
    }

    private void signup(String email) {
        http.toBlocking().exchange(HttpRequest.POST('/api/auth/signup', [email: email, password: 'password1']), Map)
    }
}
