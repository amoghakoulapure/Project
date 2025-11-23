-- SQL: create_tasks_table.sql
-- Run this in Supabase SQL editor or via a direct DB connection.
create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  is_complete boolean default false,
  reminder timestamptz,
  created_at timestamptz default now()
);
