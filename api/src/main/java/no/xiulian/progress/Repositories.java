package no.xiulian.progress;

import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.CrudRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** One repository per table; grouped here because each is three lines. */
final class Repositories {

    private Repositories() {
    }

    @Repository
    interface Cards extends CrudRepository<CardEntity, CardEntity.Id> {

        List<CardEntity> findByIdUserId(UUID userId);

        void deleteByIdUserId(UUID userId);
    }

    @Repository
    interface Reviews extends CrudRepository<ReviewEntity, ReviewEntity.Id> {

        List<ReviewEntity> findByIdUserIdOrderByIdReviewedAt(UUID userId);

        @Query(value = "insert into reviews (user_id, reviewed_at) values (:userId, :reviewedAt) on conflict do nothing", nativeQuery = true)
        void insertIgnore(UUID userId, Instant reviewedAt);

        void deleteByIdUserId(UUID userId);
    }

    @Repository
    interface Lessons extends CrudRepository<LessonEntity, LessonEntity.Id> {

        List<LessonEntity> findByIdUserId(UUID userId);

        void deleteByIdUserId(UUID userId);
    }

    @Repository
    interface Challenges extends CrudRepository<ChallengeEntity, ChallengeEntity.Id> {

        List<ChallengeEntity> findByIdUserId(UUID userId);

        void deleteByIdUserId(UUID userId);
    }

    @Repository
    interface Tribulations extends CrudRepository<TribulationEntity, TribulationEntity.Id> {

        List<TribulationEntity> findByIdUserId(UUID userId);

        void deleteByIdUserId(UUID userId);
    }

    @Repository
    interface Marks extends CrudRepository<MarkEntity, MarkEntity.Id> {

        List<MarkEntity> findByIdUserId(UUID userId);

        void deleteByIdUserId(UUID userId);
    }

    @Repository
    interface Retention extends CrudRepository<RetentionEntity, RetentionEntity.Id> {

        List<RetentionEntity> findByIdUserId(UUID userId);

        void deleteByIdUserId(UUID userId);
    }

    @Repository
    interface Settings extends CrudRepository<SettingsEntity, UUID> {
    }
}
