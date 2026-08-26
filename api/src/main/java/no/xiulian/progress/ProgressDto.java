package no.xiulian.progress;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Wire shape identical to the frontend's {@code Progress} in {@code store.ts}. Every field is optional on PATCH. */
@Serdeable
public record ProgressDto(
    @Nullable Map<String, Card> cards,
    @Nullable Map<String, Lesson> lessons,
    @Nullable Map<String, Challenge> challenges,
    @Nullable List<Long> history,
    @Nullable Settings settings,
    /** ladder stage index → epoch millis the tribulation was passed */
    @Nullable Map<String, Long> tribulations,
    /** named timestamps (epoch millis): last weekly trial, failed tribulation attempts, … */
    @Nullable Map<String, Long> marks,
    /** yyyy-mm-dd → [due reviews asked, answered right] */
    @Nullable Map<String, List<Integer>> retention
) {

    @Serdeable
    public record Card(
        Instant due,
        double stability,
        double difficulty,
        @JsonProperty("elapsed_days") int elapsedDays,
        @JsonProperty("scheduled_days") int scheduledDays,
        int reps,
        int lapses,
        short state,
        @JsonProperty("last_review") @Nullable Instant lastReview,
        @JsonProperty("learning_steps") int learningSteps
    ) {
    }

    /** {@code p} strength percent, {@code n} completions, {@code t} epoch millis of last completion. */
    @Serdeable
    public record Lesson(double p, int n, long t) {
    }

    @Serdeable
    public record Challenge(List<String> ids, List<Integer> attempts) {
    }

    @Serdeable
    public record Settings(String focus, boolean quiet, boolean audioAutoplay, int newPerLesson, boolean dark) {
    }
}
