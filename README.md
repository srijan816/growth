# Capstone Evolve - Student Growth Tracking System

A Next.js application for tracking student growth and progress across Public Speaking & Debating courses.

## Phase 0 - Foundation Complete ✅

This is the foundational implementation including:
- ✅ Next.js 15 with App Router
- ✅ Tailwind CSS + shadcn/ui components  
- ✅ Database integration
- ✅ NextAuth.js authentication
- ✅ Excel import functionality
- ✅ Responsive dashboard shell
- ✅ Mobile-first design

## Phase 1 - Complete ✅

All Phase 1 features now implemented:
- ✅ **Time-aware class selection** - Automatically shows next upcoming class with chronological ordering
- ✅ **Quick attendance entry** - Mobile-optimized star rating input (0-4 with half-star support)
- ✅ **Four-category ratings** - Attitude & Efforts, Asking Questions, Application of Skills/Content, Application of Feedback
- ✅ **Makeup class workflow** - Track cross-class attendance for missed sessions
- ✅ **Offline mode** - Local storage with automatic sync capability
- ✅ **Dashboard integration** - Quick Entry buttons and navigation
- ✅ **Auto-session creation** - Creates class sessions when needed

## Quick Start

### Prerequisites
- Node.js 18+ 

- Excel files with student roster data

### Environment Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
Update `.env.local` with your values:
```bash


# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key
```

3. **Set up database:**
- Create a new project
- Run the SQL schema from `supabase/schema.sql` in your SQL editor
- This will create all tables, indexes, and sample data

4. **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Demo Credentials

Use these credentials to log in:
- **Email:** instructor@example.com
- **Password:** changeme123

## Features

### 🎯 Core Features (Phase 0)
- **Multi-class management** - Handle 11+ courses simultaneously
- **Excel data import** - Bulk import student rosters and courses
- **Responsive design** - Mobile-first for classroom use
- **Authentication** - Secure instructor login
- **Clean UI** - Elegant design inspired by your preferences

### 📊 Dashboard
- Welcome dashboard with class overview
- Today's schedule with time-aware display
- Quick stats and recent activity
- Mobile-responsive navigation

### 📤 Import System
- Excel file upload and validation
- Preview mode before importing
- Duplicate student detection
- Error handling and reporting

### 🎨 Design System
- **Colors:** Blue primary (#4A90E2), clean whites, accent pink
- **Components:** shadcn/ui with Tailwind CSS
- **Typography:** Inter font for clean readability
- **Layout:** Card-based design like your reference images

## Excel Import Format

Your Excel files should follow this structure:
- **Sheet names** = Course codes (e.g., "02IPDEC2401")
- **Row 1** = Day and time (e.g., "Thursday", "18:00:00")
- **Row 2** = Header row (can be "Name")
- **Rows 3+** = Student names

Example:
```
Sheet: 02IPDEC2401
Row 1: Thursday | 18:00:00
Row 2: Name
Row 3: Jean Ho
Row 4: Rohan Maliah
Row 5: Edward Qian
```

## Phase 1 Features Summary ✅

**All Phase 1 features completed:**
1. ✅ **Time-aware class selection** - Automatically show next upcoming class with chronological ordering
2. ✅ **Quick attendance entry** - Mobile-optimized star rating input with half-star support
3. ✅ **Makeup class workflow** - Track cross-class attendance for missed sessions
4. ✅ **Offline mode** - Local storage with automatic sync capability

### Makeup Class Features ✅
- **Student Discovery** - Automatically finds students with missed sessions
- **Cross-Class Assignment** - Assign students to makeup sessions in other classes
- **Available Slots** - Shows available spots in each class
- **Smart Scheduling** - Prevents overbooking and manages capacity
- **Visual Integration** - Makeup students show highlighted in Quick Entry

### Offline Mode Features ✅
- **Automatic Detection** - Monitors online/offline status in real-time
- **Local Storage** - Saves attendance and makeup data when offline
- **Smart Sync** - Automatically syncs when connection returns
- **Visual Indicators** - Shows sync status throughout the interface
- **Resilient Operation** - Gracefully handles network failures
- **Data Persistence** - Maintains data across browser sessions

## Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL
- **Auth:** NextAuth.js
- **File Processing:** xlsx library
- **Deployment:** Vercel-ready

---

**Growth Compass v1.0.0 - Phase 0 Foundation**  
Built for Public Speaking & Debating instruction excellence.
