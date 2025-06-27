# Enhanced Feedback Recording Workflow

## Overview

The feedback recording system has been upgraded with a comprehensive workflow that mirrors real debate classroom scenarios. The new system provides:

1. **Google Calendar-style weekly view** for class selection
2. **Drag-and-drop team organization** for debate setup
3. **Sequential student recording** with team context
4. **Automated feedback generation** for each speaker

## New Workflow Steps

### Step 1: Class Selection (Calendar View)
- **Google Calendar-style interface** showing the instructor's weekly schedule
- **Time-aware class status**: upcoming, ongoing, completed
- **Class details**: course code, name, enrolled students, topics
- **Interactive selection** with visual feedback

### Step 2: Debate Team Setup
- **Student list** from selected class automatically loaded
- **Drag-and-drop interface** for team assignment:
  - Available students pool
  - Proposition team (green)
  - Opposition team (red)
- **Automatic position assignment**: 1st Prop, 2nd Prop, 1st Opp, 2nd Opp, etc.
- **Motion input** and debate format selection
- **Session configuration**: time limits, venue, judge names

### Step 3: Sequential Recording
- **Student-by-student recording** in debate order
- **Context-aware interface**: shows current student's position and team
- **Motion reminder** displayed during recording
- **Progress tracking** across all students
- **Skip/Navigate controls** for flexible recording

### Step 4: Completion & Review
- **Session summary** with recording statistics
- **Automatic AI feedback generation** for all recordings
- **Batch export capabilities**
- **Integration with existing feedback system**

## Technical Implementation

### New Components

1. **WeeklyCalendarView** (`src/components/recording/WeeklyCalendarView.tsx`)
   - Google Calendar-style weekly layout
   - Time-based class positioning
   - Interactive class selection
   - Status indicators (upcoming/ongoing/completed)

2. **DebateTeamSetup** (`src/components/recording/DebateTeamSetup.tsx`)
   - Drag-and-drop using `@hello-pangea/dnd`
   - Real-time team composition
   - Motion and session configuration
   - Student search and filtering

3. **StudentRecordingSession** (`src/components/recording/StudentRecordingSession.tsx`)
   - Sequential recording workflow
   - Progress tracking
   - Navigation controls
   - Context preservation

4. **FeedbackRecordingWorkflow** (`src/components/recording/FeedbackRecordingWorkflow.tsx`)
   - Main orchestrator component
   - State management across steps
   - Progress visualization
   - Workflow navigation

### New API Endpoints

- **GET /api/classes/weekly** - Fetch instructor's weekly schedule
  - Parameters: `startDate`, `endDate`
  - Returns: Array of class sessions with enrollment counts

### Database Integration

Uses existing tables:
- `class_sessions` - Class scheduling information
- `courses` - Course details and instructor assignment
- `enrollments` - Student-class relationships
- `students` - Student information

Plus new Phase 3 tables:
- `speech_recordings` - Recording metadata
- `speech_transcriptions` - AI transcription results
- `ai_generated_feedback` - Generated feedback content

## User Experience Flow

### 1. Navigation
- Access via **"Today's Feedback Recording"** in sidebar
- Clear visual progress indicator
- Breadcrumb navigation between steps

### 2. Class Selection
```
Calendar View → Class Selection → Team Setup → Recording → Complete
     ↑              ↑               ↑           ↑         ↑
   Weekly         Interactive    Drag & Drop  Sequential  Summary
   Schedule       Selection      Teams        Recording   & Export
```

### 3. Team Organization
- **Visual team composition**: Proposition (green) vs Opposition (red)
- **Position indicators**: Numbered badges showing speaking order
- **Real-time validation**: Ensures motion is entered before proceeding
- **Flexible assignment**: Students can be moved between teams and positions

### 4. Recording Session
- **Student context**: Current speaker, position, team affiliation
- **Recording controls**: Integrated with existing AudioRecorder
- **Session management**: Skip, navigate, end session controls
- **Progress tracking**: Visual indicators of completion status

## Configuration Options

### Debate Formats Supported
- **British Parliamentary (BP)** - Default
- **Asian Parliamentary (AP)**
- **Worlds Style**
- **APDA** (American Parliamentary Debate Association)

### Time Management
- **Configurable time limits** per speaker (1-10 minutes)
- **Visual time reminders** during recording
- **Format-specific defaults**

### Recording Settings
- **Audio quality**: High/Medium/Low
- **File formats**: WebM, MP3, WAV
- **Transcription provider**: AssemblyAI (default), Whisper Local, Whisper API
- **Automatic feedback generation**: Enabled by default

## Integration with Existing System

### Seamless Compatibility
- **Uses existing authentication** and user management
- **Integrates with current database schema**
- **Maintains Phase 1 & 2 functionality**
- **Compatible with existing feedback analysis**

### Data Flow
1. **Class selection** → Uses `class_sessions` and `enrollments`
2. **Team setup** → Organizes students from `students` table
3. **Recording** → Creates entries in `speech_recordings`
4. **Transcription** → Stores results in `speech_transcriptions`
5. **AI Feedback** → Generates entries in `ai_generated_feedback`
6. **Integration** → Links with existing `parsed_student_feedback` system

### Export Capabilities
- **Word documents** matching existing feedback templates
- **Batch processing** for entire debate sessions
- **CSV exports** for statistical analysis
- **PDF generation** for distribution

## Mobile Optimization

### Responsive Design
- **Mobile-first** calendar interface
- **Touch-friendly** drag-and-drop on tablets
- **Adaptive layouts** for different screen sizes
- **Progressive enhancement** for mobile recording

### Recording Features
- **Web Audio API** for cross-platform recording
- **Mobile browser support** (Chrome, Safari, Firefox)
- **Automatic quality adjustment** based on device capabilities
- **Offline recording** with sync capabilities

## Future Enhancements

### Planned Features
1. **Real-time collaboration** - Multiple instructors can manage sessions
2. **Student self-recording** - Portal for independent practice
3. **Advanced analytics** - Speech pattern analysis, improvement tracking
4. **Integration with video** - Support for video recordings
5. **Live streaming** - Real-time feedback during debates

### Extensibility
- **Plugin architecture** for custom debate formats
- **API webhooks** for third-party integrations
- **Custom rubric support** beyond 8-point system
- **Multi-language support** for international programs

## Setup Requirements

### Environment Variables
No additional environment variables required beyond Phase 3 setup.

### Dependencies Added
- `@hello-pangea/dnd` - Drag and drop functionality
- `date-fns` - Date manipulation for calendar
- `@radix-ui/react-separator` - UI component

### Browser Requirements
- **Modern browsers** with Web Audio API support
- **Microphone permissions** for recording
- **JavaScript enabled**
- **Minimum 8GB RAM** for optimal performance

The enhanced workflow transforms the recording experience from a simple audio capture tool into a comprehensive debate session management system that mirrors real classroom dynamics while maintaining the AI-powered feedback generation capabilities.