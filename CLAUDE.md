# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL DEPLOYMENT INFORMATION

### IMPORTANT: Application Must Run in Production Mode
The application **MUST** be deployed using PM2 with proper ecosystem configuration. It will NOT work if run directly with `npm start` in a non-headless environment on the VPS.

### Known Issues & Solutions
1. **Port 9001 not accessible**: The app must be started with PM2 ecosystem file, not direct npm commands
2. **Build failures**: Usually due to missing UI components - check src/components/ui/ exists
3. **Database connection errors**: Ensure PostgreSQL is running and DATABASE_URL is correct
4. **Feedback not showing**: API routes must properly query parsed_student_feedback table
5. **PM2 restarts**: Check logs at /var/www/growth-compass/logs/ for errors

## Project Overview

**Growth Compass** is a comprehensive student growth tracking platform for co-curricular programs (Public Speaking & Debating, Academic Writing, RAPS, Critical Thinking). Built with Next.js 15 App Router, PostgreSQL, and TypeScript.

### 🚀 Live Deployment
- **Production URL**: http://62.171.175.130:9001
- **VPS Server**: Ubuntu 24.04 LTS
- **Database**: PostgreSQL 17 (local to VPS)
- **Process Manager**: PM2 6.0.8 with ecosystem.config.js
- **Node.js**: v22.17.0
- **Status**: ✅ Running (0 restarts, stable)

## Commands

### Development
```bash
npm run dev              # Start development server (port 3000)
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run dev:all        # Run dev server + workers concurrently
```

### Database Management
```bash
npm run migrate         # Run pending migrations
npm run migrate:create  # Create new migration
npm run migrate:up      # Run migrations up
npm run migrate:down    # Rollback migrations
npm run migrate:status  # Check migration status
npm run migrate:reset   # Reset all migrations

# Drizzle ORM commands (if using Drizzle)
npm run drizzle:generate  # Generate SQL from schema
npm run drizzle:push      # Push schema to database
npm run drizzle:studio    # Open Drizzle Studio GUI
```

### Utility Scripts
```bash
npm run workers         # Start background workers
npm run workers:dev     # Start workers with nodemon
npm run analyze         # Analyze bundle size
npm run generate:sessions  # Generate weekly class sessions
```

## Architecture

### Core Stack
- **Frontend**: Next.js 15.3.4 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Database**: PostgreSQL with pg driver + custom query builder
- **Auth**: NextAuth v4 with credentials provider
- **State**: Zustand for client state, React Query for server state
- **Background Jobs**: Bull/BullMQ with Redis
- **AI Integration**: Google Gemini API for feedback analysis

### Database Architecture

#### Connection Management (`src/lib/database/`)
- **connection.ts**: Singleton DatabaseConnection class with connection pooling
- **query-builder.ts**: SecureQueryBuilder with parameterized queries and SQL injection protection
- **postgres.ts**: Legacy compatibility layer (deprecated, use db/qb directly)

#### Key Tables
- `users`: All users (students, instructors, parents) with role-based access
- `students`: Student profiles linked to users, includes parent_email
- `courses`: Course definitions with schedules (day_of_week, start_time, end_time)
- `enrollments`: Student-course associations
- `class_sessions`: Individual class instances with dates
- `attendances`: 4-category ratings (attitude_efforts, asking_questions, application_skills, application_feedback)
- `parsed_student_feedback`: Processed feedback from Word docs with rubric scores
- `growth_metrics`: Calculated progress metrics across 7 dimensions
- `speech_recordings`: Audio recordings metadata
- `ai_generated_feedback`: AI-processed feedback from recordings

### API Routes Structure

#### Authentication (`/api/auth/`)
- `[...nextauth]/route.ts`: NextAuth configuration

#### Student Management (`/api/students/`)
- `route.ts`: List all students with metrics
- `[id]/route.ts`: Get specific student with feedback, attendance, metrics
- `[id]/growth/route.ts`: Student growth analytics
- `[id]/categorize-feedback/route.ts`: AI categorization of feedback

#### Course & Class Management (`/api/courses/`, `/api/classes/`)
- `courses/route.ts`: List courses with enrollment counts
- `courses/[courseId]/route.ts`: Course details
- `classes/weekly/route.ts`: Weekly schedule
- `classes/today/route.ts`: Today's classes
- `classes/current/route.ts`: Currently active class

#### Attendance System (`/api/attendance/`)
- `submit/route.ts`: Submit attendance with 4-category ratings
- `quick-entry/route.ts`: Mobile-optimized quick entry
- `courses/route.ts`: Courses for attendance
- `students/route.ts`: Students in a class

#### Feedback System (`/api/feedback/`)
- `upload/route.ts`: Upload Word docs for parsing
- `analysis/route.ts`: AI analysis of feedback
- `student/[studentName]/route.ts`: Student-specific feedback

#### Growth Analytics (`/api/growth/`, `/api/analytics/`)
- `analytics/route.ts`: Program-wide analytics
- `student/[studentId]/route.ts`: Individual growth metrics

### Frontend Structure

#### Pages (App Router)
- `/`: Landing page
- `/auth/signin`: Login page
- `/dashboard`: Main dashboard (instructor view)
- `/dashboard/students/[id]`: Student profile with growth visualization
- `/dashboard/course/[courseId]`: Course details
- `/dashboard/today`: Today's schedule
- `/attendance`: Quick attendance entry interface
- `/dashboard/import`: Excel import interface

#### Key Components (`src/components/`)
- `dashboard/`: Dashboard components (sidebar, calendar, metrics)
- `attendance/`: Attendance entry components
- `recording/`: Audio recording and feedback workflow
- `ui/`: shadcn/ui base components

### Authentication Flow
1. Credentials provider with email/password
2. Roles: 'instructor', 'student', 'parent', 'admin'
3. Parent accounts linked via student.parent_email
4. Session stored in encrypted JWT

## Deployment

### Local to Production Deployment
```bash
# Automated deployment from local
python3 deploy.py

# Manual deployment on VPS
ssh root@62.171.175.130  # Password: 63r4k5PS
cd /var/www/growth-compass
pm2 stop growth-compass
git pull origin main
npm install
rm -rf .next
npm run build
pm2 start ecosystem.config.js  # CRITICAL: Must use ecosystem file
pm2 save
```

### PM2 Ecosystem Configuration (Required for Production)
```javascript
// ecosystem.config.js on VPS
module.exports = {
  apps: [{
    name: 'growth-compass',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/growth-compass',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 9001,
      HOST: '0.0.0.0'
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log'
  }]
};
```

## Environment Variables

### Required in `.env` (Production)
```bash
DATABASE_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
NEXTAUTH_URL=http://62.171.175.130:9001
NEXTAUTH_SECRET=your-secret-here-for-jwt-encryption-at-least-32-characters-long
NODE_ENV=production
PORT=9001
HOST=0.0.0.0

# AI APIs
GEMINI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY
GEMINI_API_KEY_1=REPLACE_WITH_GEMINI_KEY_PRIMARY  # Rotating pool
GEMINI_API_KEY_2=REPLACE_WITH_GEMINI_KEY_SECONDARY
OPENAI_API_KEY=REPLACE_WITH_OPENAI_API_KEY

# Feature Flags
ENABLE_AI_FEEDBACK=true
ENABLE_BULK_UPLOAD=true
ENABLE_PARENT_PORTAL=true
```

## Data Flow

### Excel Import Process
1. Upload `first.xlsx` (courses), `second.xlsx` (students), `attendance_report.xlsx`
2. Validate and preview data
3. Create courses with schedules
4. Import students and create user accounts
5. Create enrollments from course sheets
6. Generate class sessions
7. Import attendance ratings

### Feedback Processing Pipeline
1. Upload Word documents with student feedback
2. Parse documents using Mammoth
3. Extract rubric scores (secondary) or qualitative feedback (primary)
4. Store in `parsed_student_feedback` table
5. Generate growth metrics from feedback
6. Display in student profiles and parent portal

### Growth Metrics Calculation
- 7 dimensions tracked: speaking_confidence, argument_structure, critical_thinking, vocabulary_usage, delivery_skills, rebuttal_ability, overall_progress
- Metrics calculated from attendance ratings and feedback scores
- 8-week rolling window for trend analysis
- Percentile rankings against cohort

## Production Access

### VPS SSH
```bash
ssh root@62.171.175.130
# Password: 63r4k5PS
# Sudo password: srijanishero
```

### Application Credentials
- **Instructor**: srijan@capstone.com / password
- **Parent**: [student.name].parent@gmail.com / parent123
- **Test**: test@instructor.com / password

### Monitoring
```bash
pm2 status                    # Check all processes
pm2 show growth-compass      # Detailed info
pm2 logs growth-compass      # View logs
tail -f /var/www/growth-compass/logs/out.log  # Real-time logs
```

### Database Access
```bash
sudo -u postgres psql growth_compass

-- Check data integrity
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM students) as students,
  (SELECT COUNT(*) FROM courses) as courses,
  (SELECT COUNT(*) FROM parsed_student_feedback) as feedback;
```

## Current Data Statistics

- **Users**: 262 (including parents and instructors)
- **Students**: 130 enrolled
- **Courses**: 20 active
- **Enrollments**: 147
- **Class Sessions**: 20+
- **Attendance Records**: 147 with ratings
- **Feedback Records**: 109 parsed
- **Growth Metrics**: 4,240+ data points

## Important Notes

- **Build Warnings**: TypeScript and ESLint errors are ignored in production build (see next.config.ts)
- **Database Security**: Query builder uses parameterized queries and table whitelisting
- **Parent Portal**: Parents see only their linked student's data
- **Offline Support**: Attendance entry cached in localStorage
- **Mobile-First**: All interfaces optimized for phones/tablets
- **AI Rate Limiting**: Gemini API keys rotate to avoid limits

---
*Last Updated: 2025-08-06*
*Version: 2.0.0 - Full Production Release*
