create table tribulations (
    user_id   uuid not null references users on delete cascade,
    stage     int not null,
    passed_at timestamptz not null,
    primary key (user_id, stage)
);
