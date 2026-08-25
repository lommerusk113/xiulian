create table users (
    id            uuid primary key,
    email         text not null unique,
    password_hash text not null,
    created_at    timestamptz not null default now()
);

create table cards (
    user_id        uuid not null references users on delete cascade,
    word_id        text not null,
    due            timestamptz not null,
    stability      float8 not null,
    difficulty     float8 not null,
    elapsed_days   int not null,
    scheduled_days int not null,
    reps           int not null,
    lapses         int not null,
    state          smallint not null,
    last_review    timestamptz,
    learning_steps int not null,
    primary key (user_id, word_id)
);

create table reviews (
    user_id     uuid not null references users on delete cascade,
    reviewed_at timestamptz not null,
    primary key (user_id, reviewed_at)
);

create table lessons (
    user_id      uuid not null references users on delete cascade,
    unit_id      text not null,
    strength     float8 not null,
    completions  int not null,
    completed_at timestamptz not null,
    primary key (user_id, unit_id)
);

create table challenges (
    user_id  uuid not null references users on delete cascade,
    day      date not null,
    word_ids text[] not null,
    attempts int[] not null,
    primary key (user_id, day)
);

create table settings (
    user_id        uuid primary key references users on delete cascade,
    focus          text not null,
    quiet          boolean not null,
    audio_autoplay boolean not null,
    new_per_lesson int not null,
    dark           boolean not null
);
