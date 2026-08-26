create table marks (
    user_id uuid not null references users on delete cascade,
    key     text not null,
    at      timestamptz not null,
    primary key (user_id, key)
);
