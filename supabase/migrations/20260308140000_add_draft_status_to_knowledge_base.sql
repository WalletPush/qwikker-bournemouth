-- migration: add 'draft' status to knowledge_base
-- purpose: allow city knowledge entries to be stored as drafts for admin review before going live
-- affected table: knowledge_base
-- non-destructive: only widens the check constraint

-- drop existing check constraint on status column
alter table knowledge_base drop constraint if exists knowledge_base_status_check;

-- re-create with 'draft' added
alter table knowledge_base add constraint knowledge_base_status_check
  check (status in ('active', 'archived', 'processing', 'draft'));

comment on constraint knowledge_base_status_check on knowledge_base is
  'Allowed statuses: active (live/searchable), archived (soft-deleted), processing (in progress), draft (pending admin review)';
