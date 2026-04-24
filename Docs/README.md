# Smart Seat Allocation Platform

An intelligent training session management system that automates participant assignment while enforcing strict allocation rules, eliminating manual spreadsheet errors and providing real-time visibility into seat availability.

## Overview

This platform addresses the challenges large organisations face when managing training programmes at scale. It replaces error-prone manual processes (spreadsheets, emails) with an automated system that ensures:

- No session overbooking (20 participant hard limit)
- No duplicate participant assignments
- Department seat quotas respected (8/6/6 per session)
- Real-time visibility into available capacity

## Problem Solved

**Before (Manual Process):**
- Overbooked sessions due to delayed updates
- Participants assigned to multiple sessions
- Department quotas frequently violated
- No clear visibility into remaining seats

**After (Automated Platform):**
- Hard constraints enforced at every allocation
- Instant validation with user feedback
- Live seat availability dashboard
- Single source of truth for all assignments

## System Architecture
We will be using VS Code for the backend of our program. This allows us flexibility with the rest of our stack.

SQLite will be used for our database, it is lightweight and does not require configuration. This is best for demos and prototypes with time constraints

Our Frontend will use HTML, CSS and JavaScript as it provides direct control and simpler team collaboration.

We selected Python as our programming language and Flask because our projects core challenges are rule based seat allocation, which benefits from pythons fast prototyping.

Flask gives us a lightweight backend with minimal overhead, helping us to deliver faster and maintain code clarity.



