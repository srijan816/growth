# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Capstone Evolve is a co-curricular skills growth tracking platform designed specifically for Public Speaking & Debating (PSD), Academic Writing, RAPS (Research Analysis & Problem Solving), and Critical Thinking programs. The platform combines three data sources - weekly attendance ratings, instructor feedback documents, and student work samples - into unified growth analytics. It uses AI-powered analysis to identify skill development patterns and generate evidence-based reports for parents, while maintaining quick mobile data entry for instructors.

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

# Database migrations
npm run migrate                    # Run pending migrations
npm run migrate:create <name>      # Create new migration file

# Development with workers (for queue processing)
npm run dev:all                    # Runs both Next.js and workers concurrently

# Bundle analysis
npm run analyze                    # Analyze production bundle size
```

## Architecture Overview

### Tech Stack
- **Next.js 15.3.4** with App Router and Turbopack
- **NextAuth v4** for authentication (credentials provider)
- **Tailwind CSS v4** with shadcn/ui components
- **TypeScript** for type safety
- **PostgreSQL** for database (local or cloud)
- **Redis + Bull** for queue management (optional)
- **Google Gemini AI** for feedback analysis

### Key Architectural Patterns

1. **Database Relations**: Complex relational model with users → students → enrollments → courses → sessions → attendances. Uses foreign key constraints and proper indexing. Now includes parsed feedback storage and custom growth metrics tracking.

2. **Server Components First**: Use Server Components by default, Client Components only when needed (interactivity, browser APIs)

3. **Offline-First Design**: 
   - `OfflineStorage` class manages localStorage persistence
   - Automatic sync when connection returns
   - Queue system for pending operations
   - Visual indicators throughout the app

4. **Time-Aware Features**: Classes are automatically marked as "next", "ongoing", or "completed" based on current time. Next class is prioritized in Quick Entry.

5. **Three-Source Analytics System**: 
   - Weekly attendance ratings (4 categories: Attitude & Efforts, Asking Questions, Application of Skills/Content, Application of Feedback)
   - Instructor feedback documents (Word docs from `data/Overall/` folder structure)
   - Student work samples (essays, speeches, projects - future integration)
   - AI-powered pattern recognition across all sources via Gemini API
   - Multi-instructor feedback parsing with automatic attribution
   - See `FEEDBACK_EXTRACTION_DOCUMENTATION.md` for complete parsing workflow

6. **Co-Curricular Program Support**:
   - PSD (Public Speaking & Debating) - integrated program
   - Academic Writing - essay and creative writing skills
   - RAPS (Research Analysis & Problem Solving) - analytical thinking
   - Critical Thinking - logical reasoning and argumentation
   - Skill development tracking across multiple program enrollments

### Database Schema Key Points

**IMPORTANT**: The database uses these column names (not the old names in comments):
- `students` table:
  - `student_number` (NOT student_id_external)
  - `grade_level` (NOT grade)
  - `email` for parent contact
- `attendances` table:
  - `attitude_efforts` (NOT attitude_rating)
  - `asking_questions` (NOT questions_rating)
  - `application_skills` (NOT skills_rating)
  - `application_feedback` (NOT feedback_rating)
- `class_sessions` table:
  - `session_date` (NOT date)
- `courses` table:
  - No `end_time` column - only `start_time`
  - `status` = 'active' (NOT is_active = true)

- `attendance_status` enum uses 'makeup' (not 'late')
- Students linked to users via `users!students_id_fkey` relationship
- All tables have proper UUID primary keys and timestamps
- `parsed_student_feedback` table stores processed feedback documents
- Four-category attendance rating system stored in `attendances` table
- Multi-program enrollment support via `enrollments` table

### API Route Patterns

All API routes follow RESTful conventions:
- `/api/classes/[courseId]/students` - Get students with enrollments
- `/api/attendance` - POST attendance records
- `/api/makeup` - Handle makeup class assignments
- `/api/students` - Get all students with metrics
- `/api/search/students` - Search students by name
- `/api/feedback/upload` - Upload and parse feedback documents

Routes handle both online and offline scenarios, returning appropriate status codes.

### Component Architecture

- Server components by default, client components marked with 'use client'
- Shared UI components in `/components/ui` (shadcn/ui)
- Feature-specific components organized by feature (quick-entry, makeup, offline)
- Dashboard layout with responsive sidebar navigation

## Environment Configuration

Required environment variables:
```bash
# Database
DATABASE_URL=postgresql://user@localhost:5432/growth_compass

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# AI Services (optional)
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key

# Redis (optional for queue system)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Database Management

**IMPORTANT**: This project uses a structured migration system for database changes.

### Migration Guidelines
1. **Never modify existing migration files** - They may have already been run on other environments
2. **Create new migrations for schema changes**:
   ```bash
   npm run migrate:create add_column_name
   ```
3. **Run migrations**:
   ```bash
   npm run migrate
   ```
4. **Migration files are in `/migrations` directory** - Named with timestamp format: `YYYYMMDDHHMMSS_description.sql`

### Prohibited Practices
- **DO NOT create API routes for database setup/migrations** (e.g., `/api/setup-tables`, `/api/add-column`)
- **DO NOT create debug/test API routes** (e.g., `/api/test-postgres`, `/api/debug-users`)
- **DO NOT modify SQL files in `/sql/init`** - These are only for Docker first-time setup
- **DO NOT execute SQL directly in API routes** for schema changes

### Proper Database Change Process
1. Create a migration file
2. Test it locally with `npm run migrate`
3. Commit the migration file
4. Migration will run automatically on deployment

## API Route Organization

### Best Practices
1. **Group related endpoints** under resource-based routes:
   - Good: `/api/feedback`, `/api/feedback/[id]`, `/api/feedback/analysis`
   - Bad: `/api/parse-feedback`, `/api/reparse-feedback`, `/api/force-parse`

2. **Use RESTful conventions**:
   - GET for reading data
   - POST for creating/processing data
   - PUT/PATCH for updates
   - DELETE for removals

3. **Avoid route sprawl**:
   - Consolidate related functionality
   - Use query parameters for variants (e.g., `?action=reparse`)
   - Don't create separate routes for every minor variation

## Feedback Processing System

### Unified Document Processing
The system uses a **single, integrated workflow** for processing feedback documents:

1. **File Upload**: Use `/api/feedback/upload` endpoint or dashboard interface
2. **Real-time Parsing**: Documents are parsed immediately using `FeedbackParser`
3. **Direct Storage**: Parsed data goes directly to PostgreSQL database
4. **Immediate Availability**: Data is available instantly for analysis

### Feedback Types
- **Secondary Students (G7-12)**: Rubric-based scoring with 8 criteria
- **Primary Students (G2-6)**: Qualitative feedback with "What was BEST" and "Needs IMPROVEMENT"
- See `FEEDBACK_EXTRACTION_DOCUMENTATION.md` for detailed parsing rules

### Prohibited Practices
- **DO NOT use external Python scripts** for data processing
- **DO NOT check in .json result files** (use database as single source of truth)
- **DO NOT create manual data pipelines** outside the Next.js application
- **DO NOT duplicate parsing logic** across different languages/frameworks

## Common Gotchas

1. **Next.js 15 Dynamic Params**: Route params are now Promises - must await before use
2. **Database Column Names**: Always use the current schema names (see Database Schema Key Points)
3. **Attendance Status**: Use 'makeup' not 'late' in attendance_status enum
4. **Student Names**: Stored in users.name field, not separate first/last names
5. **Excel Import**: Expects specific format - sheet names as course codes, row 1 for day/time
6. **Git Worktrees**: Project may have multiple worktrees - ensure you're in the main directory

## Testing Information

- **Test Account**: Use Srijan's account for all testing purposes
  - Credentials are stored in the `.env` file
  - This is an instructor account with full access
  - Already logged in during development sessions
  - Can be used to test all instructor features and dashboards

## Phase 3: Architecture Refactoring (Current Focus)

### Recording & AI Feedback Generation
The platform is evolving to support:
- **Audio recording** of student speeches via Web Audio API
- **Auto-transcription** using Whisper v3 Turbo
- **AI feedback generation** using Google Gemini models
- **Document generation** matching existing Word templates

### New Database Tables
```sql
-- Speech recordings with metadata
speech_recordings (id, student_id, session_id, instructor_id, audio_file_path, duration_seconds, speech_topic, motion, status)

-- AI-generated feedback with confidence metrics
ai_generated_feedback (id, recording_id, transcription, rubric_scores, strengths, improvement_areas, teacher_comments, model_version, generated_at)
```

### Key Implementation Notes
- **Co-Curricular Focus**: Built for PSD, Writing, RAPS, Critical Thinking programs
- **Three-Source Analytics**: Combine attendance ratings, feedback documents, and student work
- **Unified Processing**: All feedback processing happens within Next.js application
- **AI-Powered Insights**: Use Gemini API with batch processing for pattern recognition
- **Instructor Time-Saving**: Quick mobile entry with automated insight generation
- **Evidence-Based Reports**: Link concrete work samples to skill development claims
- **Mobile-First Design**: Ensure all features work seamlessly on mobile devices
- **Real-time Data**: All processing happens in real-time with immediate database storage

When implementing new features, maintain consistency with existing patterns and UI design.