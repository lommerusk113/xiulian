package no.xiulian.progress

import io.micronaut.http.HttpRequest
import io.micronaut.http.client.HttpClient
import io.micronaut.http.client.annotation.Client
import io.micronaut.http.client.exceptions.HttpClientResponseException
import io.micronaut.test.extensions.spock.annotation.MicronautTest
import jakarta.inject.Inject
import spock.lang.Specification

import static io.micronaut.http.HttpStatus.NO_CONTENT
import static io.micronaut.http.HttpStatus.UNAUTHORIZED

@MicronautTest
class ProgressSpec extends Specification {

    @Inject
    @Client('/')
    HttpClient http

    static final Map SAMPLE = [
        cards     : ['w1': [due: '2026-08-26T10:00:00Z', stability: 1.5, difficulty: 5.2, elapsed_days: 0, scheduled_days: 1, reps: 1, lapses: 0, state: 1, last_review: '2026-08-25T10:00:00Z', learning_steps: 1]],
        lessons   : ['c1-1': [p: 100.0, n: 1, t: 1756116000000L]],
        challenges: ['2026-08-25': [ids: ['w1', 'w2'], attempts: [7, 9]]],
        history   : [1756116000000L, 1756116100000L],
        settings  : [focus: 'hanzi', quiet: true, audioAutoplay: false, newPerLesson: 4, dark: false],
        tribulations: ['1': 1756116000000L],
    ]

    def 'progress requires a token'() {
        when:
            http.toBlocking().exchange(HttpRequest.GET('/api/me/progress'), Map)
        then:
            def e = thrown(HttpClientResponseException)
            e.status == UNAUTHORIZED
    }

    def 'patch then get round-trips every section'() {
        given:
            def token = signup()
        when:
            def patched = http.toBlocking().exchange(HttpRequest.PATCH('/api/me/progress', SAMPLE).bearerAuth(token))
            def body = get(token)
        then:
            patched.status == NO_CONTENT
            body.cards.w1.due == '2026-08-26T10:00:00Z'
            body.cards.w1.stability == 1.5
            body.cards.w1.last_review == '2026-08-25T10:00:00Z'
            body.cards.w1.learning_steps == 1
            body.lessons['c1-1'] == [p: 100.0, n: 1, t: 1756116000000L]
            body.challenges['2026-08-25'] == [ids: ['w1', 'w2'], attempts: [7, 9]]
            body.history == [1756116000000L, 1756116100000L]
            body.settings == [focus: 'hanzi', quiet: true, audioAutoplay: false, newPerLesson: 4, dark: false]
            body.tribulations == ['1': 1756116000000L]
    }

    def 'patch upserts and history is idempotent'() {
        given:
            def token = signup()
            http.toBlocking().exchange(HttpRequest.PATCH('/api/me/progress', SAMPLE).bearerAuth(token))
        when:
            def delta = [cards: ['w1': SAMPLE.cards.w1 + [reps: 2]], history: [1756116100000L, 1756116200000L]]
            http.toBlocking().exchange(HttpRequest.PATCH('/api/me/progress', delta).bearerAuth(token))
            def body = get(token)
        then:
            body.cards.w1.reps == 2
            body.history == [1756116000000L, 1756116100000L, 1756116200000L]
            body.settings.focus == 'hanzi'
    }

    def 'delete clears progress but keeps the account'() {
        given:
            def token = signup()
            http.toBlocking().exchange(HttpRequest.PATCH('/api/me/progress', SAMPLE).bearerAuth(token))
        when:
            def deleted = http.toBlocking().exchange(HttpRequest.DELETE('/api/me/progress').bearerAuth(token))
            def body = get(token)
        then:
            deleted.status == NO_CONTENT
            body.cards == [:]
            body.lessons == [:]
            body.challenges == [:]
            body.history == []
            body.settings == null
            body.tribulations == [:]
    }

    private String signup() {
        http.toBlocking().exchange(HttpRequest.POST('/api/auth/signup', [email: UUID.randomUUID().toString() + '@x.no', password: 'password1']), Map).body().token
    }

    private Map get(String token) {
        http.toBlocking().exchange(HttpRequest.GET('/api/me/progress').bearerAuth(token), Map).body()
    }
}
