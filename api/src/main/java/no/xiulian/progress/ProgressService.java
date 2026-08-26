package no.xiulian.progress;

import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Singleton
@Transactional
public class ProgressService {

    private final Repositories.Cards cards;
    private final Repositories.Reviews reviews;
    private final Repositories.Lessons lessons;
    private final Repositories.Challenges challenges;
    private final Repositories.Settings settings;
    private final Repositories.Tribulations tribulations;

    public ProgressService(Repositories.Cards cards,
                           Repositories.Reviews reviews,
                           Repositories.Lessons lessons,
                           Repositories.Challenges challenges,
                           Repositories.Settings settings,
                           Repositories.Tribulations tribulations) {

        this.cards = cards;
        this.reviews = reviews;
        this.lessons = lessons;
        this.challenges = challenges;
        this.settings = settings;
        this.tribulations = tribulations;
    }

    public ProgressDto get(UUID userId) {

        var cardMap = toMap(cards.findByIdUserId(userId), c -> c.getId().wordId(), c -> new ProgressDto.Card(
            c.getDue(), c.getStability(), c.getDifficulty(), c.getElapsedDays(), c.getScheduledDays(),
            c.getReps(), c.getLapses(), c.getState(), c.getLastReview(), c.getLearningSteps()));
        var lessonMap = toMap(lessons.findByIdUserId(userId), l -> l.getId().unitId(),
            l -> new ProgressDto.Lesson(l.getStrength(), l.getCompletions(), l.getCompletedAt().toEpochMilli()));
        var challengeMap = toMap(challenges.findByIdUserId(userId), c -> c.getId().day().toString(),
            c -> new ProgressDto.Challenge(List.of(c.getWordIds()), Arrays.stream(c.getAttempts()).boxed().toList()));
        var history = reviews.findByIdUserIdOrderByIdReviewedAt(userId).stream()
            .map(r -> r.getId().reviewedAt().toEpochMilli())
            .toList();
        var s = settings.findById(userId)
            .map(e -> new ProgressDto.Settings(e.getFocus(), e.isQuiet(), e.isAudioAutoplay(), e.getNewPerLesson(), e.isDark()))
            .orElse(null);
        var tribs = toMap(tribulations.findByIdUserId(userId), t -> String.valueOf(t.getId().stage()), t -> t.getPassedAt().toEpochMilli());

        return new ProgressDto(cardMap, lessonMap, challengeMap, history, s, tribs);
    }

    /** Upserts every entry present in {@code delta}; absent keys are left untouched. */
    public void patch(UUID userId, ProgressDto delta) {

        if (delta.cards() != null) {
            cards.updateAll(delta.cards().entrySet().stream().map(e -> {
                var c = e.getValue();
                return new CardEntity(new CardEntity.Id(userId, e.getKey()), c.due(), c.stability(), c.difficulty(),
                    c.elapsedDays(), c.scheduledDays(), c.reps(), c.lapses(), c.state(), c.lastReview(), c.learningSteps());
            }).toList());
        }

        if (delta.lessons() != null) {
            lessons.updateAll(delta.lessons().entrySet().stream().map(e -> new LessonEntity(
                new LessonEntity.Id(userId, e.getKey()), e.getValue().p(), e.getValue().n(),
                Instant.ofEpochMilli(e.getValue().t()))).toList());
        }

        if (delta.challenges() != null) {
            challenges.updateAll(delta.challenges().entrySet().stream().map(e -> new ChallengeEntity(
                new ChallengeEntity.Id(userId, LocalDate.parse(e.getKey())),
                e.getValue().ids().toArray(String[]::new),
                e.getValue().attempts().stream().mapToInt(Integer::intValue).toArray())).toList());
        }

        if (delta.history() != null) {
            for (var t : delta.history()) {
                reviews.insertIgnore(userId, Instant.ofEpochMilli(t));
            }
        }

        if (delta.settings() != null) {
            var s = delta.settings();
            settings.update(new SettingsEntity(userId, s.focus(), s.quiet(), s.audioAutoplay(), s.newPerLesson(), s.dark()));
        }

        if (delta.tribulations() != null) {
            tribulations.updateAll(delta.tribulations().entrySet().stream().map(e -> new TribulationEntity(
                new TribulationEntity.Id(userId, Integer.parseInt(e.getKey())), Instant.ofEpochMilli(e.getValue()))).toList());
        }
    }

    public void delete(UUID userId) {

        cards.deleteByIdUserId(userId);
        reviews.deleteByIdUserId(userId);
        lessons.deleteByIdUserId(userId);
        challenges.deleteByIdUserId(userId);
        tribulations.deleteByIdUserId(userId);
        settings.deleteById(userId);
    }

    private static <E, V> Map<String, V> toMap(List<E> rows, Function<E, String> key, Function<E, V> value) {
        return rows.stream().collect(Collectors.toMap(key, value, (a, b) -> b, LinkedHashMap::new));
    }
}
