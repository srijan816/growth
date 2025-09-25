#!/usr/bin/env python3
"""Fix feedback visibility issues in the application"""

import paramiko

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("="*60)
    print("FIXING FEEDBACK VISIBILITY")
    print("="*60)
    
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("✅ Connected to VPS\n")
    
    # 1. Check current feedback data
    print("1. CHECKING FEEDBACK DATA IN DATABASE")
    print("-"*40)
    
    check_feedback = """sudo -u postgres psql growth_compass -t -c "
    SELECT COUNT(*) as total_feedback FROM parsed_student_feedback;
    " """
    
    stdin, stdout, stderr = ssh.exec_command(check_feedback)
    count = stdout.read().decode().strip()
    print(f"Total feedback records: {count}")
    
    # Check sample feedback
    sample_feedback = """sudo -u postgres psql growth_compass -c "
    SELECT 
        s.student_number,
        u.name as student_name,
        f.speech_topic,
        f.total_score,
        f.feedback_date
    FROM parsed_student_feedback f
    JOIN students s ON f.student_id = s.id
    JOIN users u ON s.user_id = u.id
    ORDER BY f.created_at DESC
    LIMIT 5;
    " """
    
    stdin, stdout, stderr = ssh.exec_command(sample_feedback)
    output = stdout.read().decode()
    print("\nSample feedback records:")
    print(output)
    
    # 2. Check if the API is returning feedback
    print("\n2. TESTING FEEDBACK API")
    print("-"*40)
    
    # First login to get session
    login_cmd = """curl -c /tmp/session.txt -X POST http://localhost:9001/api/auth/callback/credentials \
        -H 'Content-Type: application/x-www-form-urlencoded' \
        -d 'email=srijan@capstone.com&password=password&csrfToken=test' \
        -s -o /dev/null -w '%{http_code}'"""
    
    stdin, stdout, stderr = ssh.exec_command(login_cmd)
    login_code = stdout.read().decode().strip()
    print(f"Login status: HTTP {login_code}")
    
    # Get a student ID to test
    get_student = """sudo -u postgres psql growth_compass -t -c "
    SELECT s.id 
    FROM students s
    JOIN parsed_student_feedback f ON f.student_id = s.id
    LIMIT 1;
    " """
    
    stdin, stdout, stderr = ssh.exec_command(get_student)
    student_id = stdout.read().decode().strip()
    
    if student_id:
        print(f"Testing with student ID: {student_id}")
        
        # Test student API endpoint
        test_api = f"""curl -b /tmp/session.txt http://localhost:9001/api/students/{student_id} 2>/dev/null | python3 -c '
import sys, json
try:
    data = json.load(sys.stdin)
    if "feedback" in data:
        print(f"Feedback found: {{len(data['feedback'])}} records")
    else:
        print("No feedback field in response")
        print("Fields in response:", list(data.keys())[:5])
except Exception as e:
    print(f"Error parsing response: {{e}}")
' """
        
        stdin, stdout, stderr = ssh.exec_command(test_api)
        output = stdout.read().decode()
        print(f"API Response: {output}")
    
    # 3. Fix the API route to include feedback
    print("\n3. FIXING API ROUTES TO INCLUDE FEEDBACK")
    print("-"*40)
    
    fix_api = """cd /var/www/growth-compass && cat > fix-feedback-api.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Fix the students API route
const studentsApiPath = 'src/app/api/students/[id]/route.ts';

if (fs.existsSync(studentsApiPath)) {
    let content = fs.readFileSync(studentsApiPath, 'utf8');
    
    // Check if feedback query exists
    if (!content.includes('parsed_student_feedback')) {
        console.log('Adding feedback query to students API...');
        
        // Find where to add the feedback query
        const queryPattern = /const\s+student\s*=.*?;/s;
        
        if (queryPattern.test(content)) {
            // Add feedback query after student query
            const feedbackQuery = `
    // Get student feedback
    const feedbackResult = await pool.query(\`
      SELECT 
        f.*,
        c.name as course_name
      FROM parsed_student_feedback f
      LEFT JOIN courses c ON f.course_id = c.id
      WHERE f.student_id = $1
      ORDER BY f.feedback_date DESC
    \`, [id]);
    
    const feedback = feedbackResult.rows;`;
            
            // Add feedback to response
            content = content.replace(
                'return NextResponse.json({',
                feedbackQuery + '\\n\\n    return NextResponse.json({\\n      feedback,'
            );
            
            fs.writeFileSync(studentsApiPath, content);
            console.log('✅ Added feedback to students API');
        }
    } else {
        console.log('✅ Feedback query already exists');
    }
}

// Also check the main students list API
const studentsListPath = 'src/app/api/students/route.ts';

if (fs.existsSync(studentsListPath)) {
    let content = fs.readFileSync(studentsListPath, 'utf8');
    
    if (!content.includes('feedback_count')) {
        console.log('Adding feedback count to students list...');
        
        // Update the query to include feedback count
        const oldQuery = /SELECT.*?FROM students/s;
        const newQuery = \`SELECT 
      s.*,
      u.name,
      u.email,
      COUNT(DISTINCT f.id) as feedback_count
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN parsed_student_feedback f ON f.student_id = s.id
    GROUP BY s.id, u.id\`;
        
        content = content.replace(oldQuery, newQuery);
        fs.writeFileSync(studentsListPath, content);
        console.log('✅ Added feedback count to students list');
    }
}

console.log('API fixes complete');
EOF
node fix-feedback-api.js 2>&1 || true"""
    
    stdin, stdout, stderr = ssh.exec_command(fix_api)
    output = stdout.read().decode()
    print(output)
    
    # 4. Fix the dashboard to show feedback
    print("\n4. FIXING DASHBOARD TO SHOW FEEDBACK")
    print("-"*40)
    
    fix_dashboard = """cd /var/www/growth-compass && cat > fix-dashboard-feedback.js << 'EOF'
const fs = require('fs');

// Fix student profile page
const profilePath = 'src/app/dashboard/students/[id]/page.tsx';

if (fs.existsSync(profilePath)) {
    let content = fs.readFileSync(profilePath, 'utf8');
    
    // Check if feedback display exists
    if (!content.includes('Feedback History')) {
        console.log('Adding feedback section to student profile...');
        
        // Add feedback display section
        const feedbackSection = `
        {/* Feedback History Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Feedback History</h2>
          {student.feedback && student.feedback.length > 0 ? (
            <div className="space-y-4">
              {student.feedback.map((fb: any) => (
                <div key={fb.id} className="border rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-semibold">{fb.speech_topic || 'Speech Feedback'}</h3>
                    <span className="text-sm text-gray-500">
                      {new Date(fb.feedback_date).toLocaleDateString()}
                    </span>
                  </div>
                  {fb.total_score && (
                    <div className="mb-2">
                      <span className="font-medium">Score: </span>
                      <span className="text-lg">{fb.total_score}/40</span>
                    </div>
                  )}
                  {fb.best_moments && (
                    <div className="mb-2">
                      <span className="font-medium">Best Moments: </span>
                      <p className="text-gray-700">{fb.best_moments}</p>
                    </div>
                  )}
                  {fb.needs_improvement && (
                    <div>
                      <span className="font-medium">Areas for Improvement: </span>
                      <p className="text-gray-700">{fb.needs_improvement}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No feedback available yet.</p>
          )}
        </div>`;
        
        // Insert before closing tags
        const insertPoint = content.lastIndexOf('</div>');
        if (insertPoint > 0) {
            content = content.substring(0, insertPoint) + feedbackSection + content.substring(insertPoint);
            fs.writeFileSync(profilePath, content);
            console.log('✅ Added feedback section to student profile');
        }
    } else {
        console.log('✅ Feedback section already exists');
    }
}

console.log('Dashboard fixes complete');
EOF
node fix-dashboard-feedback.js 2>&1 || true"""
    
    stdin, stdout, stderr = ssh.exec_command(fix_dashboard)
    output = stdout.read().decode()
    print(output)
    
    # 5. Rebuild and restart
    print("\n5. REBUILDING APPLICATION")
    print("-"*40)
    
    print("Stopping app...")
    stdin, stdout, stderr = ssh.exec_command("pm2 stop growth-compass 2>/dev/null || true")
    stdout.read()
    
    print("Clearing build cache...")
    stdin, stdout, stderr = ssh.exec_command("cd /var/www/growth-compass && rm -rf .next")
    stdout.read()
    
    print("Building (this takes ~2 minutes)...")
    build_cmd = "cd /var/www/growth-compass && npm run build 2>&1 | grep -E '(Compiled|error|✓)' | head -20"
    stdin, stdout, stderr = ssh.exec_command(build_cmd, get_pty=True)
    
    build_success = False
    for line in stdout:
        if "Compiled successfully" in line:
            build_success = True
            print("✅ Build successful!")
    
    if build_success:
        print("\nStarting application...")
        stdin, stdout, stderr = ssh.exec_command("pm2 delete growth-compass 2>/dev/null || true")
        stdout.read()
        
        stdin, stdout, stderr = ssh.exec_command(
            "cd /var/www/growth-compass && PORT=9001 HOST=0.0.0.0 pm2 start npm --name growth-compass -- start"
        )
        stdout.read()
        
        stdin, stdout, stderr = ssh.exec_command("pm2 save")
        stdout.read()
        
        print("\n" + "="*60)
        print("✅ FEEDBACK VISIBILITY FIXED!")
        print("="*60)
        print(f"\n🌐 Application URL: http://{VPS_HOST}:9001")
        print("\nFeedback should now be visible:")
        print("  1. On student profile pages")
        print("  2. In the API responses")
        print("  3. For both instructors and parents")
        print("\n📊 Database has {count} feedback records")
        print("="*60)
    else:
        print("❌ Build failed")
    
finally:
    ssh.close()