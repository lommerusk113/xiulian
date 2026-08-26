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

/** Named timestamps: last weekly trial, last failed tribulation per stage, … */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "marks")
public class MarkEntity {

    @EmbeddedId
    private Id id;
    private Instant at;

    @Embeddable
    public record Id(UUID userId, String key) {
    }
}
