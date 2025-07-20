import * as XLSX from 'xlsx'

export interface ParsedCourse {
  code: string
  day: string
  time: string
  program_type: string
  level: string
  grade_range: string
  students: string[]
}

export interface ParsedStudent {
  name: string
  courses: string[]
}

export interface ExcelParseResult {
  courses: ParsedCourse[]
  students: ParsedStudent[]
  duplicateStudents: { name: string; courses: string[] }[]
  errors: string[]
}

export function parseExcelFile(buffer: Buffer): ExcelParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const courses: ParsedCourse[] = []
  const studentMap = new Map<string, string[]>()
  const errors: string[] = []

  // Parse each sheet (represents a course)
  workbook.SheetNames.forEach(sheetName => {
    try {
      const sheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      
      if (data.length < 3) {
        errors.push(`Sheet ${sheetName}: Insufficient data`)
        return
      }

      // Extract course info from second row (row index 1)
      const dayTime = data[1] || []
      const day = dayTime[0]?.toString().trim() || ''
      
      // Convert Excel decimal time to HH:MM format
      let time = ''
      if (dayTime[1] !== undefined && dayTime[1] !== null) {
        const excelTime = Number(dayTime[1])
        if (!isNaN(excelTime)) {
          // Excel stores time as fraction of day (0.5 = 12:00, 0.75 = 18:00)
          const totalMinutes = Math.round(excelTime * 24 * 60)
          const hours = Math.floor(totalMinutes / 60)
          const minutes = totalMinutes % 60
          time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        } else {
          time = dayTime[1].toString().trim()
        }
      }
      
      // Parse course code and details
      const courseCode = sheetName.trim()
      const { program_type, level, grade_range } = parseCourseCode(courseCode)
      
      // Extract student names (skip header rows - start from row 4, index 3)
      const students: string[] = []
      for (let i = 3; i < data.length; i++) {
        const row = data[i]
        if (row && row[0] && typeof row[0] === 'string') {
          const studentName = row[0].toString().trim()
          if (studentName.toLowerCase() !== 'name' && studentName) {
            students.push(studentName)
            
            // Track student across multiple courses
            const existingCourses = studentMap.get(studentName) || []
            existingCourses.push(courseCode)
            studentMap.set(studentName, existingCourses)
          }
        }
      }

      courses.push({
        code: courseCode,
        day,
        time,
        program_type,
        level,
        grade_range,
        students
      })

    } catch (error) {
      errors.push(`Error parsing sheet ${sheetName}: ${error}`)
    }
  })

  // Identify students enrolled in multiple courses
  const students: ParsedStudent[] = []
  const duplicateStudents: { name: string; courses: string[] }[] = []

  studentMap.forEach((courseList, studentName) => {
    const student = { name: studentName, courses: courseList }
    students.push(student)
    
    if (courseList.length > 1) {
      duplicateStudents.push(student)
    }
  })

  return {
    courses,
    students,
    duplicateStudents,
    errors
  }
}

function parseCourseCode(courseCode: string): {
  program_type: string
  level: string
  grade_range: string
} {
  // Default values
  let program_type = 'PSD I'
  let level = 'Primary'
  let grade_range = 'G5-6'

  // Parse based on common patterns in your data
  if (courseCode.includes('PSD')) {
    if (courseCode.includes('PSDII') || courseCode.includes('PSD II')) {
      program_type = 'PSD II'
    } else {
      program_type = 'PSD I'
    }
  }

  // Determine level based on code patterns
  if (courseCode.includes('01IP') || courseCode.includes('Secondary')) {
    level = 'Secondary'
    grade_range = 'G7-9'
  } else if (courseCode.includes('02IP') || courseCode.includes('Primary')) {
    level = 'Primary'
    
    // Determine grade range based on course code pattern
    if (courseCode.includes('EB')) {
      grade_range = 'G3-4'
    } else if (courseCode.includes('EC') || courseCode.includes('DC')) {
      grade_range = 'G5-6'
    }
  }

  return { program_type, level, grade_range }
}

export function validateCourseData(course: ParsedCourse): string[] {
  const errors: string[] = []
  
  if (!course.code) errors.push('Course code is required')
  if (!course.day) errors.push('Day is required')
  if (!course.time) errors.push('Time is required')
  if (course.students.length === 0) errors.push('At least one student is required')
  if (course.students.length > 15) errors.push('Maximum 15 students per course')
  
  // Validate time format
  if (course.time && !isValidTime(course.time)) {
    errors.push('Invalid time format')
  }
  
  // Validate day
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  if (course.day && !validDays.includes(course.day)) {
    errors.push('Invalid day of week')
  }
  
  return errors
}

function isValidTime(time: string): boolean {
  // Accept formats like "18:00:00", "18:00", "9:00", "6:00 PM"
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$|^([01]?[0-9]|2[0-3]):[0-5][0-9]\s?(AM|PM)$/i
  return timeRegex.test(time.trim())
}

export function normalizeTime(time: string): string {
  // Trim any whitespace
  time = time.trim()
  
  // Convert to 24-hour format
  if (time.includes('PM') || time.includes('AM')) {
    const [timePart, meridiem] = time.split(/\s?(AM|PM)/i)
    const [hours, minutes] = timePart.split(':')
    let hour24 = parseInt(hours)
    
    if (meridiem.toUpperCase() === 'PM' && hour24 !== 12) {
      hour24 += 12
    } else if (meridiem.toUpperCase() === 'AM' && hour24 === 12) {
      hour24 = 0
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}:00`
  }
  
  // Already in 24-hour format, ensure proper formatting
  const [hours, minutes] = time.split(':')
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`
}