insert into app_settings (id, default_rate_percent, default_penalty_type, default_penalty_value)
values (1, 12.5, 'NONE', null)
on conflict (id) do nothing;

-- Add the first owner manually after they sign in once, e.g.:
-- insert into allowed_emails (email, role) values ('you@example.com', 'owner');
