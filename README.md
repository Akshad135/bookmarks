# Bookmarks

A free, self-hostable bookmark manager to organize your web life.

<!-- ![Desktop](https://github.com/Akshad135/bookmarks/blob/main/public/desktop.png)
![Mobile](https://github.com/Akshad135/bookmarks/blob/main/public/mobile.png) -->
## Desktop
<img src="https://github.com/Akshad135/bookmarks/blob/main/public/desktop.png" width="750" alt="Desktop View"/>

## Mobile
<img src="https://github.com/Akshad135/bookmarks/blob/main/public/mobile.png" width="250" alt="Mobile View"/>

## Setup

1. **Fork this repository** to your GitHub account.

2. **Deploy to Vercel**:
   - Go to [Vercel](https://vercel.com) and "Add New Project".
     - (Create an account and connect your github repo allow Vercel to access your forked repo)
   - Import your forked repository.

4. **Setup Supabase**:
   - **Create Project**: Create a new project on [Supabase.com](https://supabase.com).
   - **Create User**: Go to **Authentication** -> **Users** -> **Add User** -> "Create New User". Enter your email and password. You will use these to log in.
   - **Database Setup**: Go to the **SQL Editor** -> **New Query** -> Paste and run the following script:

```sql
-- Create tables
create table bookmarks (
  id text primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  url text not null,
  description text,
  favicon text,
  thumbnail text,
  collection_id text default 'unsorted',
  tags text[] default array[]::text[],
  is_favorite boolean default false,
  is_archived boolean default false,
  is_trashed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table collections (
  id text primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  icon text,
  color text,
  is_system boolean default false
);

create table tags (
  id text primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  color text not null
);

-- Enable RLS
alter table bookmarks enable row level security;
alter table collections enable row level security;
alter table tags enable row level security;

-- Policies
create policy "Users can only see their own bookmarks" on bookmarks for all using ((select auth.uid()) = user_id);
create policy "Users can only see their own collections" on collections for all using ((select auth.uid()) = user_id);
create policy "Users can only see their own tags" on tags for all using ((select auth.uid()) = user_id);
```

4. **Configure Environment Variables** in Vercel settings:
   - **Required**:
     - `VITE_SUPABASE_URL`: Go to your Supabase Project -> **Project Settings** -> **Data API** -> Copy "Project URL".
     - `VITE_SUPABASE_ANON_KEY`: Go to your Supabase Project -> **Project Settings** -> **API Keys** -> Click on to the center tab **Legacy anon, service_role API keys** -> Copy "anon" public key.
   - **Optional** (for customization):
     - `VITE_APP_NAME`: Name of your app (default: "Bookmarks").
     - `VITE_APP_SUBTITLE`: Sidebar subtitle text.
     - `VITE_APP_ICON`: Path or URL to app icon (default: "/favicon.svg").

## Supported Browsers

To use the **Share via** feature on Android, please use a browser that supports PWA installation and Share Target API, such as **Chrome Mobile** or **Samsung Internet**. Install the app to your home screen to enable sharing directly from other apps.
