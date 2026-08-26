package no.xiulian.progress;

import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

/** True retention per day: due reviews asked and answered right. */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "retention")
public class RetentionEntity {

    @EmbeddedId
    private Id id;
    private int asked;
    private int correct;

    @Embeddable
    public record Id(UUID userId, LocalDate day) {
    }
}
