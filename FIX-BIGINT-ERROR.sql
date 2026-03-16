-- =====================================================
-- SUPABASE SQL - FIX BIGINT TYPE ERROR
-- =====================================================
-- Execute this script in your Supabase SQL Editor if you are getting the error:
-- 'invalid input syntax for type bigint' when creating or updating incidents.
-- This script properly converts existing `bigint` columns to `uuid`.

ALTER TABLE public.incident
  ALTER COLUMN id TYPE uuid USING id::text::uuid,
  ALTER COLUMN company_id TYPE uuid USING company_id::text::uuid,
  ALTER COLUMN team_id TYPE uuid USING team_id::text::uuid;

ALTER TABLE public.team
  ALTER COLUMN id TYPE uuid USING id::text::uuid,
  ALTER COLUMN company_id TYPE uuid USING company_id::text::uuid;

ALTER TABLE public.company
  ALTER COLUMN id TYPE uuid USING id::text::uuid;

ALTER TABLE public.user
  ALTER COLUMN id TYPE uuid USING id::text::uuid,
  ALTER COLUMN company_id TYPE uuid USING company_id::text::uuid,
  ALTER COLUMN team_id TYPE uuid USING team_id::text::uuid;

ALTER TABLE public.message
  ALTER COLUMN id TYPE uuid USING id::text::uuid,
  ALTER COLUMN sender_id TYPE uuid USING sender_id::text::uuid,
  ALTER COLUMN incident_id TYPE uuid USING incident_id::text::uuid;

ALTER TABLE public.status_history
  ALTER COLUMN id TYPE uuid USING id::text::uuid,
  ALTER COLUMN incident_id TYPE uuid USING incident_id::text::uuid;
