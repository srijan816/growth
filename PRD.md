# Product Requirements Document: Capstone Evolve

**Product:** Capstone Evolve - Co-Curricular Skills Growth Tracking Platform  
**Version:** 2.1  
**Date:** June 20, 2025  
**Status:** Active Development

## 1. Executive Summary

### The Problem
Co-curricular skills programs (Public Speaking & Debating, Academic Writing, RAPS, Critical Thinking) generate rich feedback data across multiple formats - weekly attendance ratings, detailed written feedback, and student work samples stored in Google Drive. However, this data remains disconnected, making it impossible to track longitudinal skill development or demonstrate concrete growth to parents.

### The Solution
Capstone Evolve transforms multi-source co-curricular data into unified growth insights. By combining AI-powered analysis of feedback documents, student work samples, and weekly attendance ratings, we create measurable skill development metrics that help instructors target interventions and provide parents with tangible evidence of progress.

### Key Differentiators
- **Co-Curricular Focused:** Designed specifically for PSD, Writing, RAPS, Critical Thinking programs
- **Three-Source Analytics:** Combines attendance ratings, feedback documents, and student work
- **AI-Powered Insights:** Automatically identifies growth patterns from existing data
- **Google Drive Integration:** Works with existing file storage workflows
- **Skills-Based Tracking:** Focuses on transferable abilities, not subject grades

## 2. Core Principles

1. **Save Instructor Time:** Every feature must reduce, not increase, instructor workload
2. **Multi-Source Intelligence:** Combine all available data for complete picture
3. **AI-Assisted Insights:** Let technology identify patterns humans might miss
4. **Evidence-Based Growth:** Link concrete work samples to skill development claims

## 3. User Personas & Needs

### Primary: The Instructor
**Goal:** Transform existing data into actionable growth insights  
**Needs:**
- Quick mobile attendance & rating entry with 4-category system
- AI analysis of their Google Drive feedback documents
- Automated identification of student growth patterns
- Easy parent report generation with evidence

**Current Pain:** "I have tons of feedback in Google Drive and weekly ratings, but no way to show the growth story over time"

### Secondary: The Parent
**Goal:** See tangible evidence of their investment's value  
**Needs:**
- Clear visualization of child's progress
- Access to actual work samples and feedback
- Understanding of focus areas and improvement
- Regular updates without pestering instructor

**Current Pain:** "I pay for co-curricular classes but only get scattered feedback - I want to see concrete skill development"

### Tertiary: The Student
**Goal:** Understand their growth journey  
**Needs:**
- Portfolio of their work across classes
- Clear goals to work towards
- Progress visualization

## 4. Three-Source Growth Analytics Framework

### Data Source 1: Weekly Attendance Ratings
**Current System:** 4-category rating system (0-4 stars, 0.5 increments allowed)
- **Attitude & Efforts**: Student engagement and participation
- **Asking Questions**: Curiosity and active learning behaviors  
- **Application of Skills/Content**: Demonstrating lesson concepts
- **Application of Feedback**: Implementing previous suggestions

**Growth Insight:** Track week-over-week trends in each category to identify improvement patterns and areas needing attention.

### Data Source 2: Student Feedback Documents
**Current System:** Detailed written feedback stored in Google Drive
- **Format**: Word documents with instructor observations
- **Content**: Specific skill assessments, areas for improvement, achievements
- **Volume**: Regular feedback per student across multiple sessions

**Growth Insight:** AI analysis extracts recurring themes, skill development patterns, and suggests personalized focus areas based on feedback history.

### Data Source 3: Student Work Samples  
**Current System**: Assignment submissions and recordings in Google Drive
- **PSD Classes**: Speech recordings, debate preparation materials
- **Writing Classes**: Essays, creative pieces, research assignments
- **RAPS Classes**: Analysis projects, problem-solving frameworks
- **Critical Thinking**: Argumentation exercises, logical reasoning tasks

**Growth Insight:** Compare work quality over time, track skill application, and provide concrete evidence of improvement for parent reports.

### AI-Powered Course Objective Mapping
**Process:**
1. Instructor uploads course objectives for each program (PSD, Writing, RAPS, Critical Thinking)
2. AI analyzes objectives to identify measurable skill components
3. System maps student data across all three sources to these skill areas
4. Generates personalized growth metrics recommendations per student

## 5. Feature Prioritization Matrix

### Must Have (P0)
1. **Three-Source Data Integration**
   - Connect existing attendance ratings (4 categories)
   - Parse Google Drive feedback documents
   - Link student work samples to growth tracking
   - Unified student profile across all data sources

2. **AI-Powered Growth Identification**
   - Course objective analysis and skill extraction
   - Automatic growth metric suggestions per student
   - Pattern recognition across three data sources
   - Trend analysis for intervention alerts

3. **Instructor Workflow Enhancement**
   - Mobile-optimized attendance/ratings (existing system)
   - Bulk focus area assignment based on AI insights
   - One-click parent report generation with evidence
   - Google Drive integration for seamless file access

4. **Parent Evidence Portal**
   - Visual progress tracking across skill areas
   - Access to student work samples and feedback
   - Comparative progress (student vs. previous performance)
   - Downloadable growth reports

### Should Have (P1)
1. **AI-Powered Insights**
   - Auto-suggest focus areas from feedback
   - Pattern detection across students
   - Progress predictions

2. **Advanced Visualizations**
   - Skill radar charts
   - Timeline views
   - Comparative analytics (anonymized)

3. **Student Portfolio**
   - Cross-class work collection
   - Self-reflection tools
   - Achievement badges

### Nice to Have (P2)
1. **Automated Notifications**
   - Progress alerts to parents
   - Milestone celebrations
   - Concern flags for instructors

2. **Curriculum Alignment**
   - Map skills to learning objectives
   - Track curriculum coverage
   - Identify gaps

## 5. Core User Flows

### Flow 1: Setting Student Focus Areas
```
1. Instructor selects student from class roster
2. Reviews recent feedback and AI suggestions
3. Chooses/creates focus metric (e.g., "Essay introductions")
4. Sets target and timeline
5. System tracks this across all future entries
```

### Flow 2: Quick Class Entry (Mobile)
```
1. App auto-suggests current class based on time
2. Batch attendance marking
3. Quick ratings on general categories
4. Specific rating on each student's focus area
5. Optional voice notes
6. Auto-save and sync
```

### Flow 3: Parent Report Generation
```
1. Instructor clicks "Generate Report" for student
2. System compiles:
   - Growth charts for all skills
   - Progress on current focus area
   - Recent feedback excerpts
   - Work samples
3. One-click send to parent
4. Parent accesses via secure link
```

## 6. Data Model (Simplified)

### Core Entities
- **Organizations**: Schools/institutions using the platform
- **Programs**: Different course types (Writing, Debate, STEM, etc.)
- **Skills**: Customizable skill categories per program
- **Users**: Instructors, students, parents with role-based access
- **Enrollments**: Student-program connections
- **Sessions**: Individual class meetings
- **Assessments**: Ratings + feedback for each session
- **Focus Metrics**: Custom goals per student
- **Progress**: Tracked improvement on focus metrics

### Key Relationships
- Students can have multiple enrollments across programs
- Each enrollment can have multiple focus metrics
- Assessments link to both general skills and specific focus metrics
- Feedback documents parsed and linked to assessments

## 7. Technical Architecture

### Stack
- **Frontend**: Next.js 15 with App Router (PWA-optimized)
- **Backend**: Next.js API routes + Edge functions
- **Database**: PostgreSQL with Row Level Security
- **AI/ML**: OpenAI API for feedback analysis
- **Storage**: Cloudinary for documents/media
- **Analytics**: Vercel Analytics + Custom metrics

### Key Technical Features
- Offline-first with IndexedDB + background sync

- Responsive design with mobile-first approach
- Export capabilities (PDF, CSV) for reports

## 8. Success Metrics

### Instructor Adoption
- Time to complete class entry: < 3 minutes
- Weekly active usage: 80%+ of instructors
- Feature satisfaction: 4.5+ star rating

### Parent Engagement
- Report open rate: > 70%
- Portfolio access: Monthly active
- Satisfaction score: Net Promoter Score > 50

### Student Outcomes
- Measurable improvement on focus metrics: 60%+ of students
- Goal completion rate: > 40%
- Portfolio uploads: 2+ per month average

## 9. Implementation Phases

### Phase 1: Foundation (Current - Complete)
✅ Basic authentication and course management
✅ Attendance and star ratings (4-category system)
✅ Feedback parsing system (Word documents)
✅ Database schema with growth tracking tables
⏳ Connect existing feedback data to growth analytics

### Phase 2: Three-Source Integration (Next 5 weeks)
**Week 1-2: Google Drive Integration**
- [ ] Google Drive API integration for file access
- [ ] Automated sync of feedback documents and student work
- [ ] File organization and categorization system
- [ ] Bulk import of existing Google Drive data

**Week 3-4: AI Course Objective Analysis**
- [ ] Course objective upload and parsing system
- [ ] AI extraction of measurable skill components
- [ ] Mapping system linking objectives to student data
- [ ] Growth metric generation based on objectives

**Week 5: Data Unification**
- [ ] Connect attendance ratings to feedback analysis
- [ ] Link student work samples to skill development
- [ ] Unified student profile across all three sources
- [ ] Basic trend analysis and growth visualization

### Phase 3: AI-Powered Insights (3 weeks)
**Week 1: Pattern Recognition**
- [ ] AI analysis of feedback document patterns
- [ ] Skill development trend identification
- [ ] Automated growth metric suggestions per student
- [ ] Intervention alert system for declining performance

**Week 2-3: Instructor Workflow**
- [ ] Bulk focus area assignment interface
- [ ] AI-suggested improvements based on multi-source data
- [ ] Quick insight summaries for instructor dashboard
- [ ] Mobile-optimized AI recommendations

### Phase 4: Parent Evidence Portal (2 weeks)
**Week 1: Core Portal**
- [ ] Secure parent authentication and access
- [ ] Student progress visualization across skill areas
- [ ] Integration with Google Drive for work sample access
- [ ] Downloadable progress reports with evidence

**Week 2: Enhanced Features**
- [ ] Comparative progress tracking (month-over-month)
- [ ] Automated progress notifications
- [ ] Work sample timeline with instructor comments
- [ ] Parent feedback collection system

### Phase 5: Advanced Analytics (2 weeks)
**Week 1: Enhanced Visualizations**
- [ ] Skill radar charts showing multi-dimensional growth
- [ ] Timeline views with milestone achievements
- [ ] Cross-program comparative analytics (anonymized)
- [ ] Predictive insights for continued growth

**Week 2: System Optimization**
- [ ] Performance optimization for large datasets
- [ ] Advanced reporting templates
- [ ] Export capabilities for institutional reporting
- [ ] Automated backup and data archival

## 10. Competitive Advantages

1. **Co-Curricular Specialization**: Purpose-built for PSD, Writing, RAPS, Critical Thinking programs
2. **Three-Source Intelligence**: Only platform combining attendance ratings, feedback docs, and work samples
3. **Google Drive Native**: Works with existing instructor workflows, no data migration needed
4. **AI-Powered Objectivity**: Removes bias from growth assessment through pattern recognition
5. **Evidence-Rich Reporting**: Parents get work samples + data + instructor insights in one place

## 11. Risks & Mitigation

### Risk 1: Instructor Adoption
**Mitigation**: Phased rollout, extensive training, time-saving focus

### Risk 2: Data Privacy Concerns
**Mitigation**: Clear policies, parent controls, secure architecture

### Risk 3: AI Accuracy
**Mitigation**: Human-in-loop validation, transparent suggestions

## 12. Future Vision

- **Marketplace**: Instructors share effective focus metrics
- **Benchmarking**: Anonymous skill development benchmarks
- **Integrations**: LMS, Google Classroom, communication tools
- **Mobile Apps**: Native iOS/Android for offline-heavy users

---

**Next Steps**: Complete Phase 2 Growth Engine implementation focusing on connecting existing feedback data to measurable growth metrics.