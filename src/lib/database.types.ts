export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'instructor' | 'student' | 'parent'
          password_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'instructor' | 'student' | 'parent'
          password_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'instructor' | 'student' | 'parent'
          password_hash?: string
          created_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          code: string
          name: string
          program_type: string
          level: string
          grade_range: string
          day_of_week: string
          start_time: string
          instructor_id: string
          term_type: string
          max_students: number
          status: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          program_type: string
          level: string
          grade_range: string
          day_of_week: string
          start_time: string
          instructor_id: string
          term_type: string
          max_students: number
          status: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          program_type?: string
          level?: string
          grade_range?: string
          day_of_week?: string
          start_time?: string
          instructor_id?: string
          term_type?: string
          max_students?: number
          status?: string
        }
      }
      students: {
        Row: {
          id: string
          student_number: string | null
          parent_id: string | null
          emergency_contact: any | null
        }
        Insert: {
          id: string
          student_number?: string | null
          parent_id?: string | null
          emergency_contact?: any | null
        }
        Update: {
          id?: string
          student_number?: string | null
          parent_id?: string | null
          emergency_contact?: any | null
        }
      }
      enrollments: {
        Row: {
          id: string
          student_id: string
          course_id: string
          enrollment_date: string
          status: string
          is_primary_class: boolean
        }
        Insert: {
          id?: string
          student_id: string
          course_id: string
          enrollment_date: string
          status: string
          is_primary_class?: boolean
        }
        Update: {
          id?: string
          student_id?: string
          course_id?: string
          enrollment_date?: string
          status?: string
          is_primary_class?: boolean
        }
      }
      class_sessions: {
        Row: {
          id: string
          course_id: string
          session_date: string
          lesson_number: string
          topic: string | null
          instructor_id: string
          status: string
        }
        Insert: {
          id?: string
          course_id: string
          session_date: string
          lesson_number: string
          topic?: string | null
          instructor_id: string
          status: string
        }
        Update: {
          id?: string
          course_id?: string
          session_date?: string
          lesson_number?: string
          topic?: string | null
          instructor_id?: string
          status?: string
        }
      }
      attendances: {
        Row: {
          id: string
          enrollment_id: string
          session_id: string
          status: 'present' | 'absent' | 'makeup'
          makeup_session_id: string | null
          star_rating_1: number | null
          star_rating_2: number | null
          star_rating_3: number | null
          star_rating_4: number | null
          notes: string | null
          recorded_at: string
          synced_at: string | null
        }
        Insert: {
          id?: string
          enrollment_id: string
          session_id: string
          status: 'present' | 'absent' | 'makeup'
          makeup_session_id?: string | null
          star_rating_1?: number | null
          star_rating_2?: number | null
          star_rating_3?: number | null
          star_rating_4?: number | null
          notes?: string | null
          recorded_at?: string
          synced_at?: string | null
        }
        Update: {
          id?: string
          enrollment_id?: string
          session_id?: string
          status?: 'present' | 'absent' | 'makeup'
          makeup_session_id?: string | null
          star_rating_1?: number | null
          star_rating_2?: number | null
          star_rating_3?: number | null
          star_rating_4?: number | null
          notes?: string | null
          recorded_at?: string
          synced_at?: string | null
        }
      }
    }
  }
}