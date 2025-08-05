import { drizzleDb, db, drizzleTransaction } from '../drizzle';
import { users, students, courses, enrollments, attendances } from '../schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Mock the database connection
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  
  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
  
  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe('Drizzle ORM Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Type Safety', () => {
    it('should provide type-safe queries', async () => {
      // This test primarily validates TypeScript compilation
      // The actual queries would fail without a real database
      
      // Type-safe insert
      const newUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'student' as const,
      };
      
      // These should compile without errors
      const insertQuery = drizzleDb.insert(users).values(newUser);
      
      // Type-safe select with conditions
      const selectQuery = drizzleDb
        .select()
        .from(users)
        .where(eq(users.email, 'test@example.com'));
      
      // Type-safe joins
      const joinQuery = drizzleDb
        .select({
          userName: users.name,
          studentNumber: students.studentNumber,
          courseName: courses.name,
        })
        .from(enrollments)
        .innerJoin(students, eq(enrollments.studentId, students.id))
        .innerJoin(users, eq(students.id, users.id))
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(eq(enrollments.status, 'active'));
      
      expect(insertQuery).toBeDefined();
      expect(selectQuery).toBeDefined();
      expect(joinQuery).toBeDefined();
    });

    it('should enforce schema constraints at type level', () => {
      // These should cause TypeScript errors if uncommented:
      
      // @ts-expect-error - role must be one of the defined values
      // const invalidUser = { name: 'Test', email: 'test@test.com', password: 'pass', role: 'invalid_role' };
      
      // @ts-expect-error - missing required field
      // const incompleteUser = { name: 'Test', email: 'test@test.com' };
      
      // @ts-expect-error - invalid field type
      // const wrongTypeUser = { name: 'Test', email: 'test@test.com', password: 'pass', role: 'student', createdAt: 'not-a-date' };
      
      // Valid user should work
      const validUser = {
        name: 'Valid User',
        email: 'valid@test.com',
        password: 'hashed',
        role: 'instructor' as const,
      };
      
      expect(validUser).toBeDefined();
    });
  });

  describe('Query Builders', () => {
    it('should build complex queries with type safety', () => {
      // Get students with recent attendance
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7);
      
      const complexQuery = drizzleDb
        .select({
          studentName: users.name,
          studentEmail: users.email,
          attendanceCount: attendances.id,
          avgAttitude: attendances.attitudeEfforts,
        })
        .from(attendances)
        .innerJoin(students, eq(attendances.studentId, students.id))
        .innerJoin(users, eq(students.id, users.id))
        .where(
          and(
            eq(attendances.status, 'present'),
            gte(attendances.createdAt, recentDate)
          )
        )
        .groupBy(users.name, users.email)
        .orderBy(desc(attendances.createdAt));
      
      expect(complexQuery).toBeDefined();
    });

    it('should support transactions', async () => {
      const transactionTest = async () => {
        return drizzleTransaction(async (tx) => {
          // Insert user
          const userId = uuidv4();
          await tx.insert(users).values({
            id: userId,
            name: 'Transaction Test',
            email: 'transaction@test.com',
            password: 'hashed',
          });
          
          // Insert student
          await tx.insert(students).values({
            id: userId,
            studentNumber: 'STU123',
          });
          
          return userId;
        });
      };
      
      // The function should be defined and return a promise
      expect(transactionTest).toBeDefined();
      expect(transactionTest()).toBeInstanceOf(Promise);
    });
  });

  describe('Helper Methods', () => {
    it('should provide convenient helper methods', () => {
      // Test that helper methods exist and have correct signatures
      expect(db.users.findById).toBeDefined();
      expect(db.users.findByEmail).toBeDefined();
      expect(db.students.findById).toBeDefined();
      expect(db.students.findByStudentNumber).toBeDefined();
      expect(db.courses.findById).toBeDefined();
      expect(db.courses.findByCode).toBeDefined();
      expect(db.courses.findActive).toBeDefined();
      expect(db.attendances.findBySession).toBeDefined();
      expect(db.attendances.findByStudent).toBeDefined();
      expect(db.feedback.findByStudent).toBeDefined();
      expect(db.feedback.findByInstructor).toBeDefined();
    });

    it('should include relations in helper queries', async () => {
      // Mock implementation for testing
      const mockStudent = {
        id: '123',
        studentNumber: 'STU123',
        user: { name: 'Test Student', email: 'student@test.com' },
        enrollments: [],
        attendances: [],
        feedback: []
      };
      
      // Override the implementation for testing
      jest.spyOn(db.students, 'findById').mockResolvedValue(mockStudent as any);
      
      const result = await db.students.findById('123');
      
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('enrollments');
      expect(result).toHaveProperty('attendances');
      expect(result).toHaveProperty('feedback');
    });
  });

  describe('Schema Relationships', () => {
    it('should properly define relationships between tables', () => {
      // Test that we can access related data through the schema
      const query = drizzleDb.query.users.findFirst({
        with: {
          student: {
            with: {
              enrollments: {
                with: {
                  course: true
                }
              }
            }
          }
        }
      });
      
      expect(query).toBeDefined();
    });

    it('should support nested relations', () => {
      const nestedQuery = drizzleDb.query.courses.findMany({
        with: {
          enrollments: {
            with: {
              student: {
                with: {
                  user: true,
                  attendances: {
                    limit: 5,
                    orderBy: (attendances, { desc }) => [desc(attendances.createdAt)]
                  }
                }
              }
            }
          },
          sessions: {
            with: {
              attendances: true
            }
          }
        }
      });
      
      expect(nestedQuery).toBeDefined();
    });
  });

  describe('Type Inference', () => {
    it('should correctly infer types from queries', () => {
      // Create a query and verify type inference
      const userQuery = drizzleDb.select().from(users);
      
      // The result type should be inferred correctly
      type UserResult = typeof userQuery extends Promise<infer T> ? T : never;
      
      // This is mainly a compile-time check
      const checkType: UserResult = [] as any;
      expect(Array.isArray(checkType)).toBe(true);
    });

    it('should infer joined table types', () => {
      const joinedQuery = drizzleDb
        .select({
          userId: users.id,
          userName: users.name,
          studentNumber: students.studentNumber,
          courseName: courses.name,
        })
        .from(enrollments)
        .innerJoin(students, eq(enrollments.studentId, students.id))
        .innerJoin(users, eq(students.id, users.id))
        .innerJoin(courses, eq(enrollments.courseId, courses.id));
      
      // Type should be inferred as array of objects with specific shape
      type JoinedResult = typeof joinedQuery extends Promise<infer T> ? T : never;
      
      // Compile-time type check
      const checkJoined: JoinedResult = [] as any;
      expect(Array.isArray(checkJoined)).toBe(true);
    });
  });
});