# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Growth Compass is a co-curricular skills growth tracking platform designed specifically for Public Speaking & Debating (PSD), Academic Writing, RAPS (Research Analysis & Problem Solving), and Critical Thinking programs. The platform combines three data sources - weekly attendance ratings, instructor feedback documents, and student work samples - into unified growth analytics. It uses AI-powered analysis to identify skill development patterns and generate evidence-based reports for parents, while maintaining quick mobile data entry for instructors.

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

1. **Database Relations**: Complex relational model with users → students → enrollments → courses → sessions → attendances. Uses foreign key constraints and proper indexing. Now includes parsed feedback storage and custom growth metrics tracking.

2. **Authentication Flow**: NextAuth with custom Supabase adapter. Session-based auth with JWT tokens. Role-based access (instructor/student/parent).

3. **Offline-First Design**: 
   - `OfflineStorage` class manages localStorage persistence
   - Automatic sync when connection returns
   - Queue system for pending operations
   - Visual indicators throughout the app

4. **Time-Aware Features**: Classes are automatically marked as "next", "ongoing", or "completed" based on current time. Next class is prioritized in Quick Entry.

5. **Three-Source Analytics System**: 
   - Weekly attendance ratings (4 categories: Attitude & Efforts, Asking Questions, Application of Skills/Content, Application of Feedback)
   - Instructor feedback documents (Word docs from Google Drive)
   - Student work samples (essays, speeches, projects from Google Drive)
   - AI-powered pattern recognition across all three sources

6. **Co-Curricular Program Support**:
   - PSD (Public Speaking & Debating) - integrated program
   - Academic Writing - essay and creative writing skills
   - RAPS (Research Analysis & Problem Solving) - analytical thinking
   - Critical Thinking - logical reasoning and argumentation
   - Skill development tracking across multiple program enrollments

### Database Schema Key Points

- `attendance_status` enum uses 'makeup' (not 'late')
- Students linked to users via `users!students_id_fkey` relationship
- All tables have proper UUID primary keys and timestamps
- Foreign keys require explicit relationship naming in Supabase queries
- `parsed_student_feedback` table stores processed feedback documents
- Four-category attendance rating system stored in `attendances` table
- Multi-program enrollment support via `enrollments` table

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

## Current Development Focus

### Phase Status
- **Phase 0 (Foundation)**: Complete ✅
- **Phase 1 (Basic Operations)**: Complete ✅
  - Time-aware class selection
  - Quick attendance entry with star ratings
  - Makeup class workflow
  - Offline mode with sync
  - Feedback parsing system

### Phase 2: Three-Source Integration (Active Development)
Priority tasks:
1. **Google Drive Integration**: Connect to existing instructor file storage workflows
2. **AI Course Objective Analysis**: Upload course objectives and extract measurable skills
3. **Three-Source Data Unification**: Combine attendance ratings, feedback docs, and work samples
4. **Growth Metric Generation**: AI-powered identification of student skill development patterns
5. **Instructor Workflow Enhancement**: Streamline data entry and insight generation

### Key Implementation Notes
- **Co-Curricular Focus**: Built for PSD, Writing, RAPS, Critical Thinking programs
- **Three-Source Analytics**: Combine attendance ratings, feedback documents, and student work
- **Google Drive Native**: Integrate with existing instructor file storage workflows
- **AI-Powered Insights**: Use OpenAI for course objective analysis and pattern recognition
- **Instructor Time-Saving**: Quick mobile entry with automated insight generation
- **Evidence-Based Reports**: Link concrete work samples to skill development claims
- **Mobile-First Design**: Ensure all features work seamlessly on mobile devices
- **Offline Capability**: Maintain functionality during class time without internet

When implementing new features, maintain consistency with existing patterns and UI design.