-- ============================================================
-- Email lifecycle tracking for Resend automations.
-- Keeps existing email_log fields for backwards compatibility.
-- ============================================================

alter table public.email_log
  add column if not exists user_id uuid references public.users(id) on delete set null,
  add column if not exists recipient text,
  add column if not exists related_note_id uuid,
  add column if not exists unsubscribed boolean not null default false,
  add column if not exists created_at timestamptz default now();

update public.email_log
set recipient = coalesce(recipient, recipient_email),
    created_at = coalesce(created_at, sent_at)
where recipient is null or created_at is null;

create index if not exists idx_email_log_user on public.email_log(user_id);
create index if not exists idx_email_log_recipient on public.email_log(recipient);
create index if not exists idx_email_log_sent_at on public.email_log(sent_at desc);
create index if not exists idx_email_log_user_type_sent
  on public.email_log(user_id, email_type, sent_at desc);
create index if not exists idx_email_log_related_note on public.email_log(related_note_id);
