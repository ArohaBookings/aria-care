-- ============================================================
-- Aria Care — Support Log + Participant partnership (0010)
-- Additive and idempotent. Adds two nullable columns to solo_notes:
--   participant_text — plain-language, read-with-the-participant summary
--   signoff          — support-log confirmation (participant/carer comment,
--                      confirmation status, sign-off name/date, staff name).
-- No existing data is modified. Safe to re-run.
-- ============================================================

alter table public.solo_notes
  add column if not exists participant_text text,
  add column if not exists signoff jsonb not null default '{}'::jsonb;

comment on column public.solo_notes.participant_text is
  'Plain-language participant-friendly summary suitable to read with the participant/carer. Draft only.';
comment on column public.solo_notes.signoff is
  'Support-log confirmation only (not legal proof / not a compliance guarantee): participant/carer comment, status, sign-off name + datetime, staff name.';
