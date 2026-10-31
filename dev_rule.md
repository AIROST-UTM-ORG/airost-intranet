## **1\. Purpose**

This document establishes the team's rules for using **GitHub and GitHub Projects** during the development of the Airost Intranet.

The objective is to ensure that the four team members can develop in parallel without creating unnecessary conflicts, losing work, or reducing code quality.

It also establishes basic **development ethics** so that individual contributions, AI-assisted work, code reviews, and project progress remain transparent and fair.

# **2\. GitHub Repository Rules**

## **2.1 `main` is the stable branch**

The `main` branch represents the latest stable version of the project.

### **Rules**

* Do **not** directly push feature code to `main`.  
* Do **not** force-push to `main`.  
* Do **not** delete `main`.  
* Only merge code that has been reviewed and tested.  
* Keep `main` deployable whenever practical.

main

  ↑

Pull Request

  ↑

feature branch

## **2.2 One feature \= one branch**

Each feature or bug fix should have its own branch.

### **Recommended naming**

feature/google-login

feature/project-management

feature/task-kanban

feature/document-upload

feature/event-calendar

feature/member-profile

fix/task-history

fix/login-redirect

fix/document-permission

refactor/supabase-auth

refactor/database-schema

**Avoid vague branch names such as:**

test

update

new

lee-work

final

final-final

The branch name should make its purpose obvious.

# **3\. GitHub Issues**

Every meaningful piece of work should have a **GitHub Issue**.

An Issue should contain:

Title

Description

Expected result

Acceptance criteria

Assignee

Priority

Labels

Milestone

### **Example**

**Title**

> Implement project member management

**Description**

> Allow project leads to add and remove members from a project.

**Acceptance criteria**

* Project lead can view current members.  
* Project lead can add an existing user.  
* Project lead can remove a member.  
* Unauthorized users cannot modify members.  
* Changes are reflected immediately.

This gives the developer and reviewer the same definition of "done."

---

# **4\. GitHub Projects Rules**

GitHub Projects should be the team's **central task management system**.

Recommended board:

BACKLOG

   ↓

TODO

   ↓

IN PROGRESS

   ↓

CODE REVIEW

   ↓

TESTING

   ↓

DONE

## **Status definitions**

### **BACKLOG**

A proposed task that has not yet been scheduled.

### **TODO**

The task is approved and ready to be developed.

### **IN PROGRESS**

Someone is actively working on it.

### **CODE REVIEW**

Development is complete and a Pull Request has been created.

### **TESTING**

The code has been merged or deployed to a test environment and needs functional testing.

### **DONE**

The acceptance criteria have been satisfied and the feature has been verified.

# **5\. Assignment Rules**

Each Issue should have **one primary assignee**.

Do not assign the same Issue to four people simply because everyone is involved.

Instead:

Issue \#101

Owner: Lee

Reviewer: Tony

Tester: Ahmad

The owner is responsible for completing the work.

The reviewer is responsible for reviewing the implementation.

The tester verifies the feature.

This makes accountability clear.

# **6\. Pull Request Rules**

All significant changes should be submitted through a Pull Request.

A Pull Request should explain:

**What was changed?**

**Why was it changed?**

### **Example**

\#\# What changed

Implemented project member management.

\#\# Why

Required for project-level access control.

\#\# Testing

\- Added member

\- Removed member

\- Tested unauthorized account

\#\# Related Issue

Closes \#101

# **7\. Code Review Rules**

At least **one other developer must review important Pull Requests**.

For security-sensitive changes, prefer review by Tony or another experienced developer.

### **Reviewers should check**

* Correctness  
* Security  
* Database usage  
* Error handling  
* Naming  
* Maintainability  
* Unnecessary duplication  
* UI consistency  
* Tests

### **Reviewers should not**

* Attack the developer personally  
* Reject code because "I would have written it differently" without a meaningful reason  
* Approve code without actually reviewing it

The objective of code review is:

> **Improve the code, not judge the developer.**

# **8\. Merge Rules**

A Pull Request should only be merged when:

* The feature meets its acceptance criteria.  
* The code has been reviewed.  
* Relevant tests pass.  
* No known critical bug remains.  
* Conflicts have been resolved.  
* The author has addressed important review comments.

For large changes, use a **Squash and Merge** or another consistent merge strategy agreed upon by the team.

The team should use the same merge strategy throughout the project rather than allowing every developer to choose independently.

# **9\. Commit Rules**

Commits should describe the actual change.

### **Good**

feat: add project member management

feat: implement Google OAuth login

fix: prevent unauthorized document access

fix: resolve task status update bug

refactor: migrate project queries to Supabase

docs: update database architecture

### **Avoid**

update

fix

test

changes

final

A commit history should allow another developer to understand what happened.

# **10\. Small Commits Are Preferred**

Do not wait until a feature is completely finished before committing everything.

Prefer:

commit 1 → create database tables

commit 2 → add API/data access

commit 3 → add frontend UI

commit 4 → add validation

commit 5 → add tests

rather than:

commit → EVERYTHING

This makes debugging and reviewing much easier.

# **11\. GitHub Project Planning Rules**

Every development phase should have a GitHub Project milestone.

For example:

Phase 1 — Supabase Migration

Phase 2 — Authentication & Users

Phase 3 — Projects & Tasks

Phase 4 — Documents & Events

Phase 5 — Administration & Integration

Phase 6 — Testing & Deployment

Issues should belong to the appropriate milestone.

This allows the team to see:

Phase 3

Total tasks: 18

Done:        12

In Progress:  3

Testing:      2

Todo:         1

# **14\. Do Not Commit Secrets**

Never commit:

.env

API keys

Supabase service-role keys

Google OAuth secrets

GitHub tokens

Passwords

Private credentials

Use environment variables.

Example:

VITE\_SUPABASE\_URL=...

VITE\_SUPABASE\_ANON\_KEY=...

Sensitive server-side keys should never be exposed to the React frontend.

# **15\. Do Not Work Directly on Another Developer's Branch**

Avoid making changes directly to another person's feature branch unless:

* They explicitly ask for help.  
* There is an urgent issue.  
* The team agrees that collaboration on the branch is necessary.

Normally:

Tony → Tony's branch

Lee → Lee's branch

Ahmad → Ahmad's branch

Zi Ping → Zi Ping's branch

When help is required, use a Pull Request or communicate first.

# **16\. Bug Reporting Ethics**

When reporting bugs, describe the **problem**, not the person.

### **Bad**

> "Ahmad's code is broken again."

### **Good**

> "The event permission check allows a normal member to edit an event. Reproduced using a Member account."

The team should focus on solving problems rather than assigning blame.

---

# **17\. Do Not Hide Bugs**

If you discover a bug, create an Issue or inform the responsible developer.

Do not:

* Hide a known critical bug before a demo.  
* Delete evidence of a problem.  
* Mark an Issue as completed when the acceptance criteria are not met.

A transparent bug list is better than an artificially perfect project board.

---

# **18\. Definition of Done**

An Issue should only move to **DONE** when:

☐ Feature implemented

☐ Database changes completed

☐ Authorization implemented

☐ UI completed

☐ Basic error handling completed

☐ Developer tested feature

☐ Code reviewed

☐ Critical review comments resolved

☐ Acceptance criteria satisfied

☐ Documentation updated if necessary

This prevents "DONE" from meaning merely:

> "The code works on my computer."

# **19\. Recommended GitHub Workflow**

The team's complete development process should be:

                IDEA / REQUIREMENT

                         │

                         ▼

                  GitHub Issue

                         │

                         ▼

                   GitHub Project

                         │

                         ▼

                  Assign Developer

                         │

                         ▼

                    Git Branch

                         │

                         ▼

                 AI-assisted Coding

                         │

                         ▼

                   Local Testing

                         │

                         ▼

                  Pull Request

                         │

                         ▼

                    Code Review

                         │

                         ▼

                      

              

                      Merge

                         │

                         ▼

                  GitHub Project

                    → DONE

# **22\. Recommended Team Agreement**

The following rules should be agreed upon by all four members:

### **Code**

> We do not directly push feature code to `main`.

### **Issues**

> Every meaningful feature or bug gets a GitHub Issue.

### **Pull Requests**

> Significant changes require a Pull Request and code review.

### **Ownership**

> Each Issue has one primary owner.

### **Testing**

> A feature is not DONE until it has been tested.

### **AI**

> AI-generated code must be reviewed and understood by the developer submitting it.

### **Security**

> Secrets must never be committed to GitHub.

### **Ethics**

> GitHub history and contribution records must represent the team's work honestly.

### **Communication**

> Major architecture or database changes must be communicated before implementation.

### **Respect**

> Code review critiques the implementation, not the person.

