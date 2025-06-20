# Course Objectives Upload & AI Analysis Workflow

## Overview
This workflow enables instructors to upload course objectives for each program (PSD, Writing, RAPS, Critical Thinking), which are then analyzed by AI to generate measurable skill components and personalized growth metrics.

## Step 1: Course Objectives Upload Interface

### UI Design
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 Course Objectives Management                             │
│                                                             │
│ Select Program: [PSD ▼] [Writing ▼] [RAPS ▼] [Crit Think ▼]│
│                                                             │
│ Upload Methods:                                             │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │  📄 Upload PDF  │ │  📝 Paste Text  │ │  🔗 From Drive  │ │
│ │  [Choose File]  │ │                 │ │  [Select File]  │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│                                                             │
│ Current Objectives: PSD Program                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ • Develop confident public speaking abilities        │   │
│ │ • Master argumentative structure and logic          │   │
│ │ • Improve critical analysis of opposing viewpoints  │   │
│ │ • Build research and evidence evaluation skills     │   │
│ │ • Enhance persuasive communication techniques       │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ [Analyze with AI] [Save Changes] [Preview Metrics]         │
└─────────────────────────────────────────────────────────────┘
```

### API Endpoints
```typescript
// Upload course objectives
POST /api/course-objectives
{
  program: 'PSD' | 'Writing' | 'RAPS' | 'Critical Thinking',
  objectives: string[],
  format: 'text' | 'pdf' | 'drive_link',
  file_url?: string
}

// Get objectives for program
GET /api/course-objectives/{program}

// Analyze objectives with AI
POST /api/analyze-objectives
{
  program: string,
  objectives: string[]
}
```

## Step 2: AI Analysis Process

### OpenAI Prompt Template
```
You are an educational assessment expert. Analyze the following course objectives for a [PROGRAM] program and extract measurable skill components.

Course Objectives:
[OBJECTIVES_LIST]

For each objective, identify:
1. Core skill being developed
2. Measurable behavioral indicators
3. Assessment criteria that could be tracked over time
4. Suggested growth metrics (beginner → intermediate → advanced)

Existing student data sources:
- Weekly attendance ratings (Attitude & Efforts, Asking Questions, Application of Skills/Content, Application of Feedback)
- Written instructor feedback documents
- Student work samples (essays, speeches, projects)

Return response in JSON format:
{
  "skills": [
    {
      "skill_name": "Public Speaking Confidence",
      "objective_source": "Develop confident public speaking abilities",
      "behavioral_indicators": ["Eye contact", "Voice projection", "Reduced filler words"],
      "assessment_criteria": "Progression from reading scripts to impromptu speaking",
      "growth_levels": {
        "beginner": "Reads from script with minimal eye contact",
        "intermediate": "Speaks with notes, maintains some eye contact",
        "advanced": "Delivers impromptu speeches with confident body language"
      },
      "data_mapping": {
        "attendance_categories": ["Attitude & Efforts", "Application of Skills/Content"],
        "feedback_keywords": ["confidence", "eye contact", "voice", "body language"],
        "work_sample_indicators": ["speech recordings", "presentation materials"]
      }
    }
  ]
}
```

### Processing Flow
1. **Text Extraction**: If PDF uploaded, use OCR to extract text
2. **AI Analysis**: Send to OpenAI with structured prompt
3. **Skill Validation**: Review AI suggestions against existing data
4. **Metric Generation**: Create trackable metrics for each skill
5. **Database Storage**: Save skills and mapping to growth_metrics table

## Step 3: Skill-to-Data Mapping

### Database Schema Addition
```sql
-- Enhanced growth_metrics table
CREATE TABLE course_objectives (
  id UUID PRIMARY KEY,
  program VARCHAR NOT NULL, -- 'PSD', 'Writing', 'RAPS', 'Critical Thinking'
  objective_text TEXT NOT NULL,
  ai_analysis JSONB, -- Full AI response
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE skill_components (
  id UUID PRIMARY KEY,
  objective_id UUID REFERENCES course_objectives(id),
  skill_name VARCHAR NOT NULL,
  behavioral_indicators TEXT[],
  assessment_criteria TEXT,
  growth_levels JSONB, -- beginner/intermediate/advanced descriptions
  data_mapping JSONB -- which data sources track this skill
);

CREATE TABLE student_skill_tracking (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  skill_component_id UUID REFERENCES skill_components(id),
  current_level VARCHAR, -- 'beginner', 'intermediate', 'advanced'
  evidence_sources JSONB, -- links to attendance records, feedback, work samples
  last_assessment DATE,
  progress_notes TEXT
);
```

## Step 4: Growth Metric Generation

### Automated Metric Creation
For each skill component identified by AI:

1. **Create Growth Metric Record**
```typescript
const growthMetric = {
  name: skillComponent.skill_name,
  description: skillComponent.assessment_criteria,
  metric_type: 'skill_development',
  applicable_programs: [program],
  data_sources: skillComponent.data_mapping,
  growth_levels: skillComponent.growth_levels
}
```

2. **Map to Existing Data**
```typescript
// Connect to attendance categories
const attendanceMapping = skillComponent.data_mapping.attendance_categories.map(category => {
  return {
    skill_id: skillComponent.id,
    data_source: 'attendance',
    source_field: category,
    weight: 0.3 // weighted contribution to overall skill score
  }
});

// Connect to feedback keywords
const feedbackMapping = {
  skill_id: skillComponent.id,
  data_source: 'feedback',
  keywords: skillComponent.data_mapping.feedback_keywords,
  analysis_method: 'keyword_frequency_and_sentiment'
};
```

3. **Generate Student Assignments**
```typescript
// For each student in the program, create skill tracking record
const studentSkillRecords = programStudents.map(student => ({
  student_id: student.id,
  skill_component_id: skillComponent.id,
  current_level: 'beginner', // default starting point
  evidence_sources: {},
  last_assessment: new Date()
}));
```

## Step 5: Instructor Review Interface

### AI Suggestions Review
```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Analysis Results - PSD Program                       │
│                                                             │
│ Found 5 measurable skills from your objectives:            │
│                                                             │
│ ✅ Public Speaking Confidence                               │
│    Maps to: Attitude & Efforts, Application of Skills      │
│    Keywords: "confidence", "eye contact", "voice"          │
│    [Edit] [Accept] [Reject]                                 │
│                                                             │
│ ✅ Argumentative Structure                                  │
│    Maps to: Application of Skills/Content                  │
│    Keywords: "argument", "structure", "logic"              │
│    [Edit] [Accept] [Reject]                                 │
│                                                             │
│ ⚠️  Critical Analysis (Needs Review)                        │
│    AI Confidence: 70% - May need manual adjustment         │
│    [Review Details] [Edit] [Accept] [Reject]               │
│                                                             │
│ [Accept All] [Review Individual] [Regenerate Analysis]     │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Priority

### Phase 2A (Week 3-4): Core Functionality
- [ ] Course objectives upload interface
- [ ] OpenAI integration for objective analysis
- [ ] Basic skill component extraction
- [ ] Manual review and approval workflow

### Phase 2B (Week 5): Data Integration
- [ ] Map extracted skills to existing attendance data
- [ ] Connect skills to parsed feedback documents
- [ ] Link skills to Google Drive work samples
- [ ] Generate initial student skill profiles

### Future Enhancements
- [ ] Batch processing for multiple programs
- [ ] Skill template library for common objectives
- [ ] Automated progress assessment based on multi-source data
- [ ] Cross-program skill transfer tracking