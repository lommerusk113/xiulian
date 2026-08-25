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
@Table(name = "lessons")
public class LessonEntity {

    @EmbeddedId
    private Id id;
    private double strength;
    private int completions;
    private Instant completedAt;

    @Embeddable
    public record Id(UUID userId, String unitId) {
    }
}
