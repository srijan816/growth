export interface ColumnDefinition {
  key: string;
  label: string;
  description: string;
  required: boolean;
  type: 'text' | 'number' | 'email' | 'date' | 'select';
  options?: string[];
  example?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface ValidationError {
  row: number;
  column: string;
  message: string;
  value?: any;
}

export interface UploadResult {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  errors: ValidationError[];
  data?: any[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  enabled: boolean;
  columns: ColumnDefinition[];
  templateType: 'courses' | 'enrollments' | 'lessons';
}

export interface OnboardingSession {
  id: string;
  instructorId: string;
  status: 'in_progress' | 'completed' | 'failed';
  completedSteps: string[];
  currentStep?: string;
  metadata: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
}

export interface OnboardingUpload {
  id: string;
  sessionId: string;
  step: string;
  fileName: string;
  filePath: string;
  validationStatus: 'pending' | 'valid' | 'invalid';
  validationErrors?: ValidationError[];
  rowsProcessed: number;
  rowsSucceeded: number;
  rowsFailed: number;
  uploadedAt: Date;
  processedAt?: Date;
}

// Constants and helper functions
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'courses',
    title: 'Course Catalog',
    description: 'Upload your course catalog with hierarchy information',
    completed: false,
    enabled: true,
    templateType: 'courses',
    columns: [
      {
        key: 'course_code',
        label: 'Course Code',
        description: 'Unique identifier for the course',
        required: true,
        type: 'text',
        example: 'PSD-I-G5-THU'
      },
      {
        key: 'course_name',
        label: 'Course Name',
        description: 'Full name of the course',
        required: true,
        type: 'text',
        example: 'PSD I G5-6 Thursday'
      },
      {
        key: 'division',
        label: 'Division',
        description: 'Primary or Secondary division',
        required: true,
        type: 'select',
        options: ['Primary', 'Secondary'],
        example: 'Primary'
      },
      {
        key: 'grade_group',
        label: 'Grade Group',
        description: 'Grade level grouping',
        required: true,
        type: 'select',
        options: ['G3-4', 'G5-6', 'G7-9', 'G7-12'],
        example: 'G5-6'
      },
      {
        key: 'skill_level',
        label: 'Skill Level',
        description: 'Program skill level',
        required: true,
        type: 'select',
        options: ['PSD I', 'PSD II', 'PSD III', 'JOT', 'OT'],
        example: 'PSD I'
      }
    ]
  },
  {
    id: 'enrollments',
    title: 'Student Enrollments',
    description: 'Upload student enrollment data for courses',
    completed: false,
    enabled: false,
    templateType: 'enrollments',
    columns: [
      {
        key: 'student_name',
        label: 'Student Name',
        description: 'Full name of the student',
        required: true,
        type: 'text',
        example: 'John Smith'
      },
      {
        key: 'student_email',
        label: 'Student Email',
        description: 'Student email address',
        required: true,
        type: 'email',
        example: 'john.smith@email.com'
      },
      {
        key: 'course_code',
        label: 'Course Code',
        description: 'Must match a course from the catalog',
        required: true,
        type: 'text',
        example: 'PSD-I-G5-THU'
      },
      {
        key: 'enrollment_date',
        label: 'Enrollment Date',
        description: 'Date of enrollment',
        required: false,
        type: 'date',
        example: '2024-01-15'
      }
    ]
  },
  {
    id: 'lessons',
    title: 'Lesson Materials',
    description: 'Upload lesson plans and student submissions',
    completed: false,
    enabled: false,
    templateType: 'lessons',
    columns: [
      {
        key: 'course_code',
        label: 'Course Code',
        description: 'Must match a course from the catalog',
        required: true,
        type: 'text',
        example: 'PSD-I-G5-THU'
      },
      {
        key: 'lesson_number',
        label: 'Lesson Number',
        description: 'Sequential lesson number',
        required: true,
        type: 'number',
        example: '1'
      },
      {
        key: 'lesson_title',
        label: 'Lesson Title',
        description: 'Title of the lesson',
        required: true,
        type: 'text',
        example: 'Introduction to Public Speaking'
      }
    ]
  }
];

export function getNextAvailableStep(completedSteps: string[]): OnboardingStep | null {
  for (const step of ONBOARDING_STEPS) {
    if (!completedSteps.includes(step.id)) {
      return step;
    }
  }
  return null;
}