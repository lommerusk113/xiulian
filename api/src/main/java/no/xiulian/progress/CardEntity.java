package no.xiulian.progress;

import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "cards")
public class CardEntity {

    @EmbeddedId
    private Id id;
    private Instant due;
    private double stability;
    private double difficulty;
    private int elapsedDays;
    private int scheduledDays;
    private int reps;
    private int lapses;
    private short state;
    private Instant lastReview;
    private int learningSteps;

    @Embeddable
    public record Id(UUID userId, String wordId) {
    }
}
