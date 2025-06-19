# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Growth Compass is a student growth tracking system for Public Speaking & Debating courses. It tracks attendance, student progress across 4 rating categories, and supports offline operation with sync capabilities.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Architecture Overview

### Tech Stack
- **Next.js 15.3.4** with App Router and Turbopack
- **Supabase** (PostgreSQL) for database with Row Level Security
- **NextAuth v4** for authentication (credentials provider)
- **Tailwind CSS v4** with shadcn/ui components
- **TypeScript** for type safety

### Key Architectural Patterns

1. **Database Relations**: Complex relational model with users → students → enrollments → courses → sessions → attendances. Uses foreign key constraints and proper indexing.

2. **Authentication Flow**: NextAuth with custom Supabase adapter. Session-based auth with JWT tokens. Role-based access (instructor/student/parent).

3. **Offline-First Design**: 
   - `OfflineStorage` class manages localStorage persistence
   - Automatic sync when connection returns
   - Queue system for pending operations
   - Visual indicators throughout the app

4. **Time-Aware Features**: Classes are automatically marked as "next", "ongoing", or "completed" based on current time. Next class is prioritized in Quick Entry.

5. **Star Rating System**: 4 categories with 0-4 scale (0.5 increments allowed):
   - Attitude & Efforts
   - Asking Questions  
   - Application of Skills/Content
   - Application of Feedback

### Database Schema Key Points

- `attendance_status` enum uses 'makeup' (not 'late')
- Students linked to users via `users!students_id_fkey` relationship
- All tables have proper UUID primary keys and timestamps
- Foreign keys require explicit relationship naming in Supabase queries

### API Route Patterns

All API routes follow RESTful conventions:
- `/api/classes/[courseId]/students` - Get students with enrollments
- `/api/attendance` - POST attendance records
- `/api/makeup` - Handle makeup class assignments

Routes handle both online and offline scenarios, returning appropriate status codes.

### Component Architecture

- Server components by default, client components marked with 'use client'
- Shared UI components in `/components/ui` (shadcn/ui)
- Feature-specific components organized by feature (quick-entry, makeup, offline)
- Dashboard layout with responsive sidebar navigation

## Environment Configuration

Required environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

## Testing & Quality

Currently no test framework is configured. When implementing tests:
- Check for testing framework in package.json first
- Ask user for preferred testing approach if needed
- Suggest adding test commands to package.json

## Common Gotchas

1. **Next.js 15 Dynamic Params**: Route params are now Promises - must await before use
2. **Supabase Foreign Keys**: Always specify exact relationship (e.g., `users!students_id_fkey`)
3. **Attendance Status**: Use 'makeup' not 'late' in attendance_status enum
4. **Student Names**: Stored in users.name field, not separate first/last names
5. **Excel Import**: Expects specific format - sheet names as course codes, row 1 for day/time

## Phase Status

- **Phase 0 (Foundation)**: Complete ✅
- **Phase 1**: Complete ✅
  - Time-aware class selection
  - Quick attendance entry with star ratings
  - Makeup class workflow
  - Offline mode with sync

When implementing new features, maintain consistency with existing patterns and UI design.