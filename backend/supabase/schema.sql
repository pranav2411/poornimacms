create extension if not exists "uuid-ossp";

create table if not exists vendors (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists complaints (
  id uuid primary key default uuid_generate_v4(),
  complaint_code text unique not null,
  room text not null,
  category text not null,
  title text not null,
  description text not null,
  status text not null,
  priority text not null,
  assigned_vendor text,
  work_completed boolean not null default false,
  otp_verified boolean not null default false,
  otp_hash text,
  otp_expires_at timestamptz,
  last_reminder_sent timestamptz,
  close_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists complaint_timeline (
  id uuid primary key default uuid_generate_v4(),
  complaint_id uuid not null references complaints(id) on delete cascade,
  label text not null,
  time timestamptz not null default now(),
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  timestamp timestamptz not null default now()
);

create index if not exists complaints_status_idx on complaints(status);
create index if not exists complaints_assigned_idx on complaints(assigned_vendor);
create index if not exists timeline_complaint_idx on complaint_timeline(complaint_id);
