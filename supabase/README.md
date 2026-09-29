# Database Schema (SQL)

This document contains the PostgreSQL schema translated from the MongoDB models located in `server/models/`. This is suitable for use in Supabase.

```sql
-- Projects
CREATE TABLE projects (
    project_id INT PRIMARY KEY,
    title TEXT,
    description TEXT,
    lead TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks (Derived from ProjectBoard)
CREATE TABLE tasks (
    task_id TEXT PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    title TEXT,
    column_name TEXT,
    assignee TEXT,
    created_by TEXT,
    description TEXT,
    priority TEXT,
    due_date TIMESTAMPTZ
);

-- TaskHistory
CREATE TABLE task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL,
    project_id INT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
    field TEXT NOT NULL CHECK (field IN ('title', 'description', 'column', 'assignee', 'priority', 'dueDate', 'task_created', 'task_deleted')),
    old_value JSONB,
    new_value JSONB,
    changed_by TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    change_description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_history_task_id_timestamp ON task_history(task_id, timestamp DESC);
CREATE INDEX idx_task_history_project_id_timestamp ON task_history(project_id, timestamp DESC);

-- Users
CREATE TABLE users (
    google_id TEXT PRIMARY KEY,
    email TEXT,
    name TEXT NOT NULL,
    photo TEXT NOT NULL,
    position TEXT[] NOT NULL,
    description TEXT,
    year TEXT,
    course TEXT,
    phonenum TEXT,
    instagram TEXT
);

-- VerifiedUsers
CREATE TABLE verified_users (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT[] NOT NULL
);

-- Docs
CREATE TABLE docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image TEXT NOT NULL,
    title TEXT NOT NULL,
    profile TEXT NOT NULL,
    author TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
