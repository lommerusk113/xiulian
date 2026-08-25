package no.xiulian.progress;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "settings")
public class SettingsEntity {

    @Id
    private UUID userId;
    private String focus;
    private boolean quiet;
    private boolean audioAutoplay;
    private int newPerLesson;
    private boolean dark;
}
