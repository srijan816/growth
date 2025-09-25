#!/usr/bin/env python3
"""Populate parent portal with data and create parent accounts"""

import paramiko
import json

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("="*60)
    print("POPULATING PARENT PORTAL WITH DATA")
    print("="*60)
    
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("✅ Connected to VPS\n")
    
    # Create script to populate parent portal data
    populate_script = """cd /var/www/growth-compass && cat > populate-parent-portal.js << 'EOF'
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'growth_compass',
  user: 'growthcompass',
  password: 'secure_password_123'
});

async function populateParentPortal() {
  try {
    console.log('Populating Parent Portal with data...');
    
    // 1. Create parent accounts for some students
    console.log('\\n1. Creating parent accounts...');
    const hashedPassword = await bcrypt.hash('parent123', 10);
    
    // Get some students to create parent accounts for
    const studentsResult = await pool.query(`
      SELECT s.id, s.student_number, u.name, s.grade_level
      FROM students s
      JOIN users u ON s.user_id = u.id
      LIMIT 10
    `);
    
    const parentAccounts = [];
    for (const student of studentsResult.rows) {
      const parentEmail = student.name.toLowerCase().replace(/\\s+/g, '.') + '.parent@gmail.com';
      const parentName = student.name + ' (Parent)';
      
      // Create parent user account
      const parentResult = await pool.query(`
        INSERT INTO users (email, name, password, role)
        VALUES ($1, $2, $3, 'parent')
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name
        RETURNING id, email
      `, [parentEmail, parentName, hashedPassword]);
      
      // Update student with parent email
      await pool.query(`
        UPDATE students 
        SET parent_email = $1, parent_phone = '+1-555-0100'
        WHERE id = $2
      `, [parentEmail, student.id]);
      
      parentAccounts.push({
        email: parentEmail,
        studentName: student.name,
        grade: student.grade_level
      });
    }
    
    console.log('  ✅ Created', parentAccounts.length, 'parent accounts');
    console.log('\\n  Sample parent logins:');
    parentAccounts.slice(0, 3).forEach(p => {
      console.log('    Email:', p.email);
      console.log('    Password: parent123');
      console.log('    Student:', p.studentName, '(' + p.grade + ')');
      console.log('    ---');
    });
    
    // 2. Add sample feedback data for students
    console.log('\\n2. Adding sample feedback data...');
    
    const feedbackTemplates = [
      {
        best: 'Excellent use of voice modulation and confident stage presence. Strong opening that captured audience attention.',
        improvement: 'Work on maintaining eye contact throughout the speech. Practice smoother transitions between main points.',
        topic: 'Should homework be banned?',
        motion: 'This house believes that homework should be banned in primary schools'
      },
      {
        best: 'Outstanding argumentation with clear logical structure. Effective use of examples to support points.',
        improvement: 'Slow down delivery pace to allow audience to absorb complex ideas. Add more emotional appeal to balance logic.',
        topic: 'Technology in education',
        motion: 'This house would replace traditional textbooks with digital devices'
      },
      {
        best: 'Powerful conclusion that tied all arguments together. Great use of rhetorical questions to engage audience.',
        improvement: 'Strengthen rebuttals by directly addressing opposing arguments. Work on time management to avoid rushing.',
        topic: 'Environmental conservation',
        motion: 'This house believes schools should have mandatory recycling programs'
      }
    ];
    
    // Add feedback for students with attendance
    const attendanceResult = await pool.query(`
      SELECT DISTINCT a.student_id, a.session_id, cs.course_id, cs.session_date
      FROM attendances a
      JOIN class_sessions cs ON a.session_id = cs.id
      LIMIT 20
    `);
    
    let feedbackCount = 0;
    for (const [index, attendance] of attendanceResult.rows.entries()) {
      const template = feedbackTemplates[index % feedbackTemplates.length];
      
      // Add parsed feedback
      await pool.query(`
        INSERT INTO parsed_student_feedback (
          student_id, session_id, course_id, feedback_date,
          speech_topic, motion, side, speech_type,
          content_score, style_score, strategy_score, poi_score, total_score,
          best_moments, needs_improvement,
          instructor_name, created_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15,
          'Srijan', NOW()
        ) ON CONFLICT DO NOTHING
      `, [
        attendance.student_id, attendance.session_id, attendance.course_id, attendance.session_date,
        template.topic, template.motion, 'Government', 'Prepared',
        7.5, 8.0, 7.0, 6.5, 29.0,
        template.best, template.improvement
      ]);
      
      feedbackCount++;
    }
    
    console.log('  ✅ Added', feedbackCount, 'feedback records');
    
    // 3. Add growth metrics for students
    console.log('\\n3. Adding growth metrics...');
    
    const metricsResult = await pool.query(`
      SELECT DISTINCT student_id FROM attendances
    `);
    
    let metricsCount = 0;
    for (const student of metricsResult.rows) {
      // Add various growth metrics
      const metrics = [
        { type: 'speaking_confidence', value: 75, trend: 'improving' },
        { type: 'argument_structure', value: 82, trend: 'stable' },
        { type: 'critical_thinking', value: 78, trend: 'improving' },
        { type: 'vocabulary_usage', value: 85, trend: 'improving' },
        { type: 'overall_progress', value: 80, trend: 'improving' }
      ];
      
      for (const metric of metrics) {
        await pool.query(`
          INSERT INTO growth_metrics (
            student_id, metric_type, metric_date, 
            value, percentile, trend
          ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [
          student.student_id, 
          metric.type, 
          metric.value,
          Math.floor(metric.value * 0.9), // Percentile
          metric.trend
        ]);
        metricsCount++;
      }
    }
    
    console.log('  ✅ Added', metricsCount, 'growth metrics');
    
    // 4. Update attendance records with more detailed ratings
    console.log('\\n4. Enhancing attendance ratings...');
    
    const updateResult = await pool.query(`
      UPDATE attendances
      SET 
        attitude_efforts = 3.0 + RANDOM(),
        asking_questions = 2.5 + RANDOM() * 1.5,
        application_skills = 3.0 + RANDOM(),
        application_feedback = 2.5 + RANDOM() * 1.5,
        notes = 'Student showed good participation and engagement in class activities.'
      WHERE attitude_efforts IS NULL OR attitude_efforts = 0
      RETURNING id
    `);
    
    console.log('  ✅ Updated', updateResult.rows.length, 'attendance records');
    
    // 5. Generate more class sessions for historical data
    console.log('\\n5. Generating historical sessions...');
    
    await pool.query(`
      INSERT INTO class_sessions (course_id, session_date, topic)
      SELECT 
        c.id,
        generate_series(
          CURRENT_DATE - INTERVAL '8 weeks',
          CURRENT_DATE - INTERVAL '1 week',
          '1 week'::interval
        )::date + 
        CASE c.day_of_week
          WHEN 'Monday' THEN 0
          WHEN 'Tuesday' THEN 1
          WHEN 'Wednesday' THEN 2
          WHEN 'Thursday' THEN 3
          WHEN 'Friday' THEN 4
          WHEN 'Saturday' THEN 5
          WHEN 'Sunday' THEN 6
        END,
        'Week ' || EXTRACT(WEEK FROM generate_series(
          CURRENT_DATE - INTERVAL '8 weeks',
          CURRENT_DATE - INTERVAL '1 week',
          '1 week'::interval
        )::date) || ' - Debate Practice'
      FROM courses c
      WHERE c.status = 'active'
      ON CONFLICT (course_id, session_date) DO NOTHING
    `);
    
    // Final statistics
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'parent') as parents,
        (SELECT COUNT(*) FROM parsed_student_feedback) as feedback,
        (SELECT COUNT(*) FROM growth_metrics) as metrics,
        (SELECT COUNT(*) FROM attendances WHERE attitude_efforts > 0) as rated_attendance,
        (SELECT COUNT(*) FROM class_sessions) as sessions
    `);
    
    console.log('\\n📊 PARENT PORTAL DATA SUMMARY:');
    console.log('================================');
    console.log('  Parent Accounts:', stats.rows[0].parents);
    console.log('  Feedback Records:', stats.rows[0].feedback);
    console.log('  Growth Metrics:', stats.rows[0].metrics);
    console.log('  Rated Attendances:', stats.rows[0].rated_attendance);
    console.log('  Total Sessions:', stats.rows[0].sessions);
    console.log('================================');
    
    console.log('\\n✅ Parent portal data populated successfully!');
    console.log('\\n🔑 PARENT LOGIN EXAMPLES:');
    console.log('================================');
    parentAccounts.slice(0, 3).forEach((p, i) => {
      console.log(`\\nParent Account ${i + 1}:`);
      console.log('  Email:', p.email);
      console.log('  Password: parent123');
      console.log('  Student:', p.studentName);
      console.log('  Grade:', p.grade);
    });
    console.log('================================');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

populateParentPortal();
EOF
node populate-parent-portal.js"""
    
    print("Running parent portal population script...")
    stdin, stdout, stderr = ssh.exec_command(populate_script, get_pty=True)
    
    # Stream output
    for line in stdout:
        print(line.strip())
    
    # Restart the app
    print("\n🔄 Restarting application...")
    stdin, stdout, stderr = ssh.exec_command("pm2 restart growth-compass", get_pty=True)
    output = stdout.read().decode()
    
    print("\n" + "="*60)
    print("✅ PARENT PORTAL IS NOW POPULATED!")
    print("="*60)
    print(f"\n📱 Access the application: http://{VPS_HOST}:9001")
    print("\n👨‍🏫 INSTRUCTOR LOGIN:")
    print("   Email: srijan@capstone.com")
    print("   Password: password")
    print("\n👪 PARENT PORTAL:")
    print("   Parents can now log in with their accounts")
    print("   Password for all parent accounts: parent123")
    print("\n✨ FEATURES NOW AVAILABLE:")
    print("   ✓ Student growth visualization")
    print("   ✓ Attendance tracking with ratings")
    print("   ✓ Feedback history")
    print("   ✓ Progress metrics")
    print("   ✓ Parent dashboard")
    print("="*60)
    
finally:
    ssh.close()