# Intranet features summary

This file summarizes two source documents:

- **`overall_feature.md`:** *Club Intranet - Feature Roadmap* (modules, access levels per role, priorities, development order)
- **`feature.md`:** *Airost Intranet - Feature Roadmap and Tech Stack Analysis* (features, priorities, and the database decision)

---

# Part A: Club intranet feature roadmap

## A1. Roles and priority legend

**Roles:** Member, Committee, Admin

| Priority | Meaning |
|---|---|
| 🔴 Must | Build for MVP |
| 🟠 High | Build after MVP |
| 🟡 Medium | Useful enhancement |
| 🟢 Later | Advanced / optional |

## A2. Features by module

Access symbols: ✅ allowed, ❌ not allowed, "Own" / "Event" / "All" = scope of access, "Manage" = can configure, "Limited" = reduced view, "-" = not role-based (system feature).

### Authentication

| Feature | Access | Priority |
|---|---|---|
| Login, Logout, Registration | All roles | 🔴 Must |
| Access Token, Refresh Token | System | 🔴 Must |
| Forgot Password, Reset Password | All roles | 🟠 High |
| Email Verification | All roles | 🟡 Medium |

### Membership

| Feature | Member / Committee / Admin | Priority |
|---|---|---|
| Member Approval | ❌ / ❌ / ✅ | 🔴 Must |
| Member Status | View / View / Manage | 🔴 Must |
| Member Profile | Edit own / Edit own / Manage | 🔴 Must |
| Member Directory | ✅ / ✅ / ✅ | 🔴 Must |
| Invite Members | ❌ / ❌ / ✅ | 🟠 High |
| Suspend / Deactivate Member | ❌ / ❌ / ✅ | 🟠 High |

### Roles and permissions

| Feature | Access | Priority |
|---|---|---|
| Member Role, Committee Role, Admin Role | Admin manages | 🔴 Must |
| Permission Management | Admin only | 🟠 High |

### Dashboard

| Feature | Member / Committee / Admin | Priority |
|---|---|---|
| Member Dashboard | ✅ / ✅ / - | 🔴 Must |
| Admin Dashboard | ❌ / ❌ / ✅ | 🔴 Must |
| Statistics / KPIs | Limited / Limited / ✅ | 🟠 High |
| Recent Activities | ✅ / ✅ / ✅ | 🟡 Medium |

### Events

| Feature | Member / Committee / Admin | Priority |
|---|---|---|
| View Events | ✅ / ✅ / ✅ | 🔴 Must |
| Create Event | ❌ / ✅ / ✅ | 🔴 Must |
| Edit Event | ❌ / ✅ / ✅ | 🔴 Must |
| Event Registration | ✅ / ✅ / ✅ | 🔴 Must |
| Delete Event | ❌ / ❌ / ✅ | 🟠 High |
| Registration Capacity | - / Manage / Manage | 🟠 High |
| Registration Deadline | - / Manage / Manage | 🟠 High |
| Event Organizer | - / Manage / Manage | 🟡 Medium |

### Attendance

| Feature | Member / Committee / Admin | Priority |
|---|---|---|
| View Attendance | Own / Event / All | 🟠 High |
| Mark Attendance | ❌ / ✅ / ✅ | 🟠 High |
| Attendance Statistics | Own / Event / All | 🟡 Medium |
| QR Attendance | ✅ / ✅ / ✅ | 🟡 Later |

### Announcements

| Feature | Member / Committee / Admin | Priority |
|---|---|---|
| View Announcements | ✅ / ✅ / ✅ | 🔴 Must |
| Create Announcement | ❌ / ✅ / ✅ | 🔴 Must |
| Edit / Delete Announcement | ❌ / Own / All | 🟠 High |
| Announcement Categories | ✅ / ✅ / ✅ | 🟡 Medium |
| Priority Announcements | - / Manage / Manage | 🟡 Medium |

### Documents

| Feature | Member / Committee / Admin | Priority |
|---|---|---|
| View / Download Documents | ✅ / ✅ / ✅ | 🟠 High |
| Upload Documents | ❌ / ✅ / ✅ | 🟠 High |
| Delete Documents | ❌ / Own / All | 🟠 High |
| Document Categories | - / Manage / Manage | 🟡 Medium |
| Access Restrictions | - / - / ✅ | 🟡 Medium |

### Calendar

| Feature | Member / Committee / Admin | Priority |
|---|---|---|
| View Calendar | ✅ / ✅ / ✅ | 🟠 High |
| Create Calendar Event | ❌ / ✅ / ✅ | 🟠 High |
| Edit Calendar Event | ❌ / Own / All | 🟠 High |

### Notifications

| Feature | Access | Priority |
|---|---|---|
| In-App Notifications, Event Registration Notification, Announcement Notification, Mark as Read | All roles | 🟠 High |
| Email Notifications | All roles | 🟡 Later |

### Administration

| Feature | Access | Priority |
|---|---|---|
| User Management | Admin only | 🔴 Must |
| Role Management | Admin only | 🟠 High |
| Club Settings | Admin only | 🟠 High |
| System Configuration | Admin only | 🟡 Medium |

### Security

| Feature | Access | Priority |
|---|---|---|
| Protected Routes, Protected API Endpoints, Password Hashing, Token Validation | System | 🔴 Must |
| Rate Limiting | System | 🟠 High |
| Audit Logs | Admin only | 🟠 High |

### Communication (all 🟢 Later, all roles)

Discussion Board, Comments, Reactions, Mentions.

### Advanced (all 🟢 Later)

QR Event Check-in, Advanced Search, Analytics (Limited for Member/Committee, full for Admin), File Versioning (Committee/Admin manage), Real-time Notifications, PWA / Mobile Experience.

## A3. MVP scope (🔴 Must)

- **Authentication:** login, logout, registration, access and refresh tokens
- **Membership:** member approval, status, profile, directory
- **Roles:** member, committee and admin roles
- **Dashboard:** member and admin dashboards
- **Events:** view, create, edit, register
- **Announcements:** view, create
- **Administration:** user management
- **Security:** protected routes and API endpoints, password hashing, token validation

## A4. Recommended development order

1. Authentication
2. Membership + Roles
3. Member Profiles / Directory
4. Dashboard
5. Events + Registration
6. Announcements
7. Documents
8. Calendar
9. Notifications
10. Admin Panel
11. Attendance
12. Audit Logs
13. Advanced Features

---

# Part B: Airost intranet feature roadmap and tech stack

## B1. Team

Ling Lee Hom, Tony Hoe Zhi Wan, Ahmad, Zi Ping

## B2. Features by module

### Authentication and access

| Feature | Description | Priority |
|---|---|---|
| Google Login | Login using Airost/Google account | Essential |
| Logout | Securely sign out | Essential |
| User Verification | Admin creates/approves verified users | Essential |
| Role Management | Different permissions for Admin, Project Lead, Member, etc. | Essential |
| Project Access Control | Restrict users to specific projects | Essential |
| Account Status | Enable/disable user accounts | High |

**Example roles**

| Role | Capabilities |
|---|---|
| Admin | Manage users, projects, documents |
| Project Lead | Manage project, members, tasks |
| Member | View projects, manage assigned tasks, upload documents |

### Members and profiles

| Feature | Description | Priority |
|---|---|---|
| Member Directory | Browse all members | Essential |
| Member Profile | View member information | Essential |
| Edit Profile | Members update their own information | Essential |
| Profile Picture | Upload/change avatar | High |
| Position / Department | Display member's role | High |
| Contact Information | Email and other contact details | Medium |
| Project Memberships | Show projects a member belongs to | Medium |

### Projects

| Feature | Description | Priority |
|---|---|---|
| Create Project | Create a new project | Essential |
| Project Overview | Description, status, progress | Essential |
| Project Members | Add/remove members | Essential |
| Project Roles | Lead/member permissions | Essential |
| Project Dashboard | Show project progress | High |
| GitHub-style Project Page | Structured project workspace | Medium |

### Task management

| Feature | Description | Priority |
|---|---|---|
| Create Task | Create work items | Essential |
| Assign Task | Assign to member | Essential |
| Task Status | Backlog / Todo / In Progress / Done | Essential |
| Priority | Low / Medium / High | Essential |
| Due Date | Task deadline | Essential |
| Task Description | Detailed task information | Essential |
| Comments | Team discussion | High |
| Task History | Track changes | High |
| Sprint | Group tasks into development cycles | High |
| Backlog | Store upcoming work | High |

### Documents and knowledge

| Feature | Description | Priority |
|---|---|---|
| Project Documents | Documents attached to projects | Essential |
| Upload Files | Upload PDF, DOCX, images, etc. | Essential |
| Download Files | Download documents | Essential |
| File Metadata | Name, uploader, date, size | Essential |
| Document Permissions | Only authorized members can access | Essential |
| Folders/Categories | Organize documents | High |
| Version History | Keep previous versions | Medium |
| Document Search | Search document names/content metadata | Medium |

**Recommended structure:** each project holds folders such as *Documentation* (requirements, meeting notes, architecture), *Design* (UI files, mockups) and *Reports* (progress reports).

### Events and calendar

| Feature | Description | Priority |
|---|---|---|
| Event Calendar | View upcoming events | Essential |
| Create Event | Create meetings/events | Essential |
| Edit Event | Change event details | Essential |
| Event Details | Time, location, description, organizer | Essential |
| Event Permissions | Certain roles can manage events | Essential |
| Project Events | Connect an event to a project | High |
| Google Calendar Sync | Sync Airost events with Google Calendar | Medium |
| Event Reminders | Notify users before events | Medium |

### Notifications and activity log

| Feature | Priority |
|---|---|
| Notification Center | High |
| Task Notifications | High |
| Event Notifications | High |
| Read/Unread Status | High |
| Document Notifications | Medium |
| Task History | Already demonstrated |
| Project Activity | High |
| Admin Audit Log | High |
| User Activity | Medium |

### Administration and system settings

| Feature | Description | Priority |
|---|---|---|
| User Management | Create/edit/disable users | Essential |
| Role Management | Manage permissions | Essential |
| Project Management | Manage all projects | Essential |
| Document Management | Manage uploaded documents | High |
| Event Management | Manage organizational events | High |
| Activity Logs | Review important actions | High |
| System Dashboard | Statistics and overview | Medium |

### Dashboard and search

- **Dashboard:** summary of everything happening in Airost.
- **Search:** across People, Projects, Tasks, Documents and Events.

## B3. Priority summary

**Core areas (Essential):**

- Authentication and access: Google login, roles, permissions
- Members: profiles, directory
- Projects: projects, members, Kanban/tasks
- Documents: upload/download/project permissions
- Events: calendar and event management
- Admin: users, projects, documents
- Dashboard: basic overview

**Should have:** task comments, task/project activity history, notifications, global search, sprint/backlog management, project dashboard.

**Nice to have:** Google Calendar synchronization, document versioning, advanced analytics, realtime updates, advanced search, GitHub integration.

## B4. Database decision

The platform model is relationship-heavy (users, projects, tasks, documents, events, notifications, activity history) with planned AI capabilities. The prototype uses Node.js, Express, MongoDB/Mongoose and React, with implemented Google login, project tracking, Kanban tasks, task editing and task history.

### Comparison

| Category | MongoDB Atlas | Firebase | Supabase |
|---|---|---|---|
| Database | MongoDB NoSQL | Firestore NoSQL | PostgreSQL SQL |
| Migration from current project | Easiest | Hard | Hard |
| Handling relationships | Moderate | Weak | Strongest |
| Authentication | Needs backend/provider setup | Built in | Built in |
| File storage | Separate service | Built in | Built in |
| Realtime | Available, more setup | Strong | Strong |
| Access control | Mostly application-managed | Security Rules | PostgreSQL RLS |
| Reporting / complex queries | Good | Weak | Strongest |
| AI / vector search | Strong | Good | Strong |
| Vendor lock-in | Lower | Higher | Lower |
| Overall fit for Airost | 4 / 5 | 3 / 5 | **5 / 5** |

### Pros and cons

| Option | Advantages | Disadvantages |
|---|---|---|
| **MongoDB Atlas** | Lowest-risk option; keeps existing Mongoose architecture; text and vector search support | Team must build and maintain auth, storage and authorization; relational data is less natural |
| **Firebase** | Fast development; built-in Auth, Firestore, Storage, realtime; fits the Google ecosystem; Gemini tooling | Firestore's data model struggles with many relationships and needs duplicated data; harder as reporting needs grow |
| **Supabase** | Full PostgreSQL with Auth, Storage, Realtime, Edge Functions and vectors; foreign keys and SQL; Row Level Security for project-level access | Migration effort: schema redesign, backend rewrite, and learning PostgreSQL, SQL and RLS |

### Decision: Supabase

The team selected Supabase (PostgreSQL) based on the following architectural factors:

1. **Relational model:** Users, projects, tasks, documents, events, and notifications are interconnected entities that benefit from foreign key constraints and join queries.
2. **Integrated backend services:** Authentication, object storage, realtime subscriptions, and SQL APIs exist in a unified service.
3. **Database access control:** PostgreSQL Row Level Security allows platform and project-level authorization rules directly in database policies.
4. **Vector extensions:** pgvector supports embeddings and vector search for planned AI features.
5. **Tooling and migrations:** Automated code generation and LLM tooling assist in generating SQL migrations, CRUD queries, RLS policies, and tests.

### Summary of the recommendation

| Decision | Platform |
|---|---|
| Lowest migration risk | MongoDB Atlas |
| Fastest simple prototype | Firebase |
| Best overall architecture, relational model, built-in services, project-level authorization, future AI | **Supabase** |

**Trade-off:** The team invests upfront effort into migrating schemas, authentication, and queries from MongoDB to PostgreSQL before proceeding with new feature development.

---

# Part C: Notes across the two documents

| Topic | Club Intranet (Part A) | Airost Intranet (Part B) |
|---|---|---|
| Roles | Member, Committee, Admin | Admin, Project Lead, Member (and others) |
| Login | Email/password with tokens, forgot/reset password | Google login |
| Organizing unit | Club-wide modules | Projects, with project-level access control |
| Tasks / Kanban / Sprints | Not included | Core feature |
| Attendance / QR check-in | Included (High / Later) | Not included |
| Announcements | Included (Must) | Not included |
| Discussion board, reactions | Included (Later) | Comments on tasks only |
| Documents | Upload files, categories, access restrictions | Upload files, project permissions, folders, versioning |
| Audit logs | High priority | High priority (admin audit log) |

**Differences to confirm:**

- **Database:** Part B recommends moving to Supabase (PostgreSQL), but the earlier schema file (`database-schema.md`) describes a MongoDB design. The schema would need to be redone if Supabase is chosen.
- **Documents:** the schema stores only external links (Google Docs / Drive), while both roadmaps describe uploading and downloading files.
- **Attendance:** the schema tracks registration and status only, while Part A also lists QR attendance and attendance statistics.
