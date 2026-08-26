create table retention (
    user_id uuid not null references users on delete cascade,
    day     date not null,
    asked   int not null,
    correct int not null,
    primary key (user_id, day)
);
