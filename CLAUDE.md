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
```

## Architecture Overview

### Tech Stack
- **Next.js 15.3.4** with App Router and Turbopack

- **NextAuth v4** for authentication (credentials provider)
- **Tailwind CSS v4** with shadcn/ui components
- **TypeScript** for type safety

### Key Architectural Patterns

1. **Database Relations**: Complex relational model with users → students → enrollments → courses → sessions → attendances. Uses foreign key constraints and proper indexing. Now includes parsed feedback storage and custom growth metrics tracking.



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
   - AI-powered pattern recognition across all sources via Gemini 2.5
   - Multi-instructor feedback parsing with automatic attribution
   - See `FEEDBACK_SYSTEM_DOCUMENTATION.md` for complete parsing workflow

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

NEXTAUTH_URL=
NEXTAUTH_SECRET=
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

## Testing & Quality

Currently no test framework is configured. When implementing tests:
- Check for testing framework in package.json first
- Ask user for preferred testing approach if needed
- Suggest adding test commands to package.json
- Create proper unit/integration tests instead of debug API routes

## Common Gotchas

1. **Next.js 15 Dynamic Params**: Route params are now Promises - must await before use

3. **Attendance Status**: Use 'makeup' not 'late' in attendance_status enum
4. **Student Names**: Stored in users.name field, not separate first/last names
5. **Excel Import**: Expects specific format - sheet names as course codes, row 1 for day/time

## Major Architecture Refactoring (In Progress)

### Architecture Goals
Transform the codebase from a mixed-concern prototype into a production-grade, scalable platform following these principles:

1. **Single Source of Truth**: All data access through a centralized Data Access Layer (DAL)
2. **API-First Design**: Complete separation between frontend and backend
3. **Modern Data Fetching**: React Query for all client-side data management
4. **Normalized Schema**: Fully relational database design with proper constraints
5. **Configuration Management**: Environment-based configuration, no hardcoded values

### Data Access Layer (DAL) Architecture

All database interactions go through a centralized DAL with these components:

```typescript
// Core DAL structure
DataAccessLayer/
├── base/
│   ├── BaseRepository.ts    // Abstract base class for all repositories
│   └── DatabaseConnection.ts // Connection pooling and transaction management
├── repositories/
│   ├── StudentRepository.ts  // Student-related operations
│   ├── CourseRepository.ts   // Course and hierarchy management
│   ├── FeedbackRepository.ts // Feedback storage and retrieval
│   ├── AttendanceRepository.ts // Attendance tracking
│   └── AnalyticsRepository.ts // Cross-program analytics
└── index.ts                  // Main DAL export
```

**Key Principles:**
- No raw SQL in API routes or components
- All queries go through repository methods
- Built-in caching and optimization
- Type-safe query building
- Transaction support for complex operations

### API Architecture

All data flows through RESTful API endpoints:

```
/api/
├── dashboard/
│   ├── summary              // Dashboard summary data
│   ├── metrics              // Growth metrics
│   └── analytics            // Cross-program analytics
├── students/
│   ├── [id]                 // Individual student data
│   ├── [id]/growth          // Growth tracking
│   └── [id]/enrollments     // Course enrollments
├── courses/
│   ├── [id]                 // Course details
│   ├── [id]/students        // Enrolled students
│   └── hierarchy            // Division/grade structure
├── feedback/
│   ├── upload               // Document upload
│   ├── [id]                 // Individual feedback
│   └── analysis             // AI-powered analysis
├── onboarding/              // Bulk data import
│   ├── courses              // Course catalog upload
│   ├── enrollments          // Student enrollment upload
│   └── lessons              // Lesson materials upload
└── attendance/
    ├── record               // Record attendance
    └── bulk                 // Bulk attendance operations
```

### Client-Side Architecture

**React Query Integration:**
- All data fetching through custom hooks
- Automatic caching and background refetching
- Optimistic updates for better UX
- Proper loading and error states

**Component Structure:**
- Presentational components (pure UI)
- Container components (data fetching)
- Clear separation of concerns
- Minimal prop drilling

### Database Schema Evolution

**Course Hierarchy Tables:**
```sql
course_divisions (Primary, Secondary)
grade_groups (G3-4, G5-6, G7-9, G7-12)
skill_levels (PSD I, II, III, JOT, OT)
course_configurations (links courses to grade/skill combinations)
```

**Lesson Management:**
```sql
lesson_plans (course-specific lesson templates)
lesson_submissions (student work and recordings)
lesson_feedback (AI and manual feedback)
```

### Onboarding System Architecture

**Multi-Step Wizard Interface:**
1. **Course Catalog Upload**
   - Course codes, names, descriptions
   - Division and grade assignments
   - Skill level mappings

2. **Student Enrollment Upload**
   - Student information
   - Course enrollments
   - Enrollment periods

3. **Lesson Materials Upload**
   - Lesson plans per course
   - Student submissions
   - Feedback documents

**Data Validation:**
- Column-level validation
- Cross-reference checking
- Error reporting with row numbers
- Template generation for each step

### Configuration Management

**Environment Variables:**
```bash
# API Configuration
API_BASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Storage Configuration
FEEDBACK_STORAGE_PATH=
UPLOAD_TEMP_PATH=

# External Services
REDIS_URL=
GEMINI_API_KEY=
WHISPER_API_KEY=

# Feature Flags
ENABLE_AI_FEEDBACK=
ENABLE_BULK_UPLOAD=
```

### Migration Strategy

**Phase 1: Foundation (Current)**
- Create DAL structure
- Implement base repositories
- Set up migration system

**Phase 2: API Layer**
- Create new API endpoints
- Migrate from direct DB access
- Implement proper authentication

**Phase 3: Frontend Refactor**
- Install React Query
- Convert components to use API
- Remove direct DB dependencies

**Phase 4: Schema Evolution**
- Add course hierarchy tables
- Implement lesson management
- Build onboarding system

**Phase 5: Polish**
- Performance optimization
- Error handling improvements
- Documentation updates

## Current Development Focus

### Phase Status
- **Phase 0 (Foundation)**: Complete ✅
- **Phase 1 (Basic Operations)**: Complete ✅
- **Phase 2: Three-Source Integration**: Complete ✅
- **Phase 3: Architecture Refactoring**: In Progress 🚧

### Phase 3: Architecture Refactoring (Current Phase)
**Vision**: Transform the platform from feedback analysis to complete feedback generation and analysis ecosystem.

#### Core Objectives:
- **Record student speeches** directly through the platform
- **Auto-transcribe** using Whisper v3 Turbo
- **Generate AI feedback** using Google Gemini models
- **Create downloadable feedback documents** matching existing format
- **Integrate with existing analytics** for unified growth tracking

#### Implementation Phases:

**Phase 3.1: Core Infrastructure (4-6 weeks)**
- [ ] Audio recording system with Web Audio API
- [ ] File storage architecture for recordings and generated documents
- [ ] Database schema extensions for speech recordings and AI feedback
- [ ] Basic Whisper v3 Turbo integration
- [ ] Document generation system using existing feedback templates

**Phase 3.2: AI Feedback Generation (4-6 weeks)**
- [ ] Gemini integration for debate-specific feedback generation
- [ ] Advanced prompt engineering for rubric scoring
- [ ] Feedback document generation matching existing Word templates
- [ ] Instructor review and editing interface for AI-generated feedback
- [ ] Quality assurance and confidence metrics

**Phase 3.3: Workflow Integration (3-4 weeks)**
- [ ] Unified analytics combining manual and AI-generated feedback
- [ ] Enhanced growth tracking with speech-based insights
- [ ] Bulk operations for recording sessions and document generation
- [ ] Real-time transcription capabilities
- [ ] Mobile-optimized recording interface

**Phase 3.4: Advanced Features (Future)**
- [ ] Speech pattern analysis (pace, pauses, confidence)
- [ ] Real-time feedback suggestions during recording
- [ ] Student self-assessment portal
- [ ] Advanced comparative analytics across recording sessions
- [ ] Voice coaching and pronunciation feedback

#### Technical Architecture:

**New Database Tables:**
```sql
-- Speech recordings with metadata
speech_recordings (id, student_id, session_id, instructor_id, audio_file_path, duration_seconds, speech_topic, motion, status)

-- AI-generated feedback with confidence metrics
ai_generated_feedback (id, recording_id, transcription, rubric_scores, strengths, improvement_areas, teacher_comments, model_version, generated_at)
```

**New API Endpoints:**
```
/api/recording/* - Audio recording and file management
/api/transcription/* - Whisper v3 Turbo integration
/api/ai-feedback/* - Gemini-powered feedback generation
/api/documents/* - Downloadable document generation
```

**Key Libraries:**
- **Audio**: recordrtc, wavesurfer.js
- **Transcription**: OpenAI Whisper v3 Turbo API
- **AI**: @google/generative-ai
- **Documents**: docx, pizzip
- **Storage**: multer, sharp
- **Queue**: bull, redis

#### Integration with Existing System:

**Unified Data Model:**
- Extend existing `StudentFeedback` interface with source tracking (`manual` | `ai-generated`)
- Maintain compatibility with current analytics and growth tracking
- Add recording metadata and transcription data to feedback records

**Enhanced Analytics:**
- Compare manual vs AI feedback consistency
- Track feedback generation confidence metrics
- Analyze speech patterns and improvement over time
- Unified growth analytics across all feedback sources

#### Success Metrics:
- **Efficiency**: Reduce feedback generation time from hours to minutes
- **Consistency**: Maintain rubric scoring standards across instructors
- **Scalability**: Support multiple concurrent recording sessions
- **Quality**: Achieve 95%+ transcription accuracy with 85%+ feedback relevance
- **Adoption**: Seamless integration with existing instructor workflows

#### Dependencies:
- OpenAI Whisper v3 Turbo API access
- Google Gemini API integration
- Enhanced storage capacity for audio files
- Redis for queue management
- Updated hosting infrastructure for processing demands

## Feedback Processing System

### Unified Document Processing
The system uses a **single, integrated workflow** for processing feedback documents:

1. **File Upload**: Use `/api/feedback/upload` endpoint or dashboard interface
2. **Real-time Parsing**: Documents are parsed immediately using `FeedbackParser`
3. **Direct Storage**: Parsed data goes directly to PostgreSQL database
4. **Immediate Availability**: Data is available instantly for analysis

### Prohibited Practices
- **DO NOT use external Python scripts** for data processing
- **DO NOT check in .json result files** (use database as single source of truth)
- **DO NOT create manual data pipelines** outside the Next.js application
- **DO NOT duplicate parsing logic** across different languages/frameworks

### Feedback Extraction System
For detailed information about how feedback is extracted from Word documents for both primary and secondary students, see:
- **[FEEDBACK_EXTRACTION_DOCUMENTATION.md](./FEEDBACK_EXTRACTION_DOCUMENTATION.md)** - Complete technical documentation
- Primary extraction: `/scripts/import-primary-feedback.js`
- Secondary extraction: `/scripts/import-secondary-feedback-v2.js`

### File Upload Guidelines
- Use the integrated file upload component for admin users
- Upload .docx or .doc files through the web interface
- Files are automatically parsed and stored in the database
- Results are immediately available across the application

### Legacy Scripts
- Python scripts moved to `/legacy/python-scripts/` (reference only)
- JSON artifacts moved to `/legacy/json-artifacts/` (reference only)
- All functionality integrated into Next.js application

### Key Implementation Notes
- **Co-Curricular Focus**: Built for PSD, Writing, RAPS, Critical Thinking programs
- **Three-Source Analytics**: Combine attendance ratings, feedback documents, and student work
- **Unified Processing**: All feedback processing happens within Next.js application
- **AI-Powered Insights**: Use Gemini 2.5 with batch processing for pattern recognition
- **Instructor Time-Saving**: Quick mobile entry with automated insight generation
- **Evidence-Based Reports**: Link concrete work samples to skill development claims
- **Mobile-First Design**: Ensure all features work seamlessly on mobile devices
- **Real-time Data**: All processing happens in real-time with immediate database storage

When implementing new features, maintain consistency with existing patterns and UI design.