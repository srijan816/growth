#!/usr/bin/env node

const https = require('https');

// Configuration
const HOST = 'localhost';
const PORT = 3000;

// Function to make HTTP request
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        // Add session cookie if needed
        'Cookie': '_ga=GA1.1.1234; next-auth.session-token=YOUR_SESSION_TOKEN'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function reparseAllFeedback() {
  console.log('🔄 Starting feedback reparse for all debaters...\n');
  
  try {
    // Make POST request to reparse endpoint
    const response = await makeRequest('POST', '/api/feedback');
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Reparse completed successfully!\n');
      console.log('📊 Summary:');
      console.log(`   - Total records parsed: ${response.data.summary.totalRecordsParsed}`);
      console.log(`   - Total records stored: ${response.data.summary.totalRecordsStored}`);
      console.log(`   - Total unique students: ${response.data.summary.totalStudents}`);
      
      if (response.data.summary.instructorStats) {
        console.log('\n📈 Instructor Statistics:');
        response.data.summary.instructorStats.forEach(stat => {
          console.log(`   - ${stat.instructor}: ${stat.count} records, ${stat.unique_students} students`);
        });
      }
      
      if (response.data.summary.errors && response.data.summary.errors.length > 0) {
        console.log('\n⚠️  Errors encountered:');
        response.data.summary.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
      }
    } else {
      console.error('❌ Reparse failed:', response.data);
    }
  } catch (error) {
    console.error('❌ Error during reparse:', error.message);
  }
}

// Note about authentication
console.log(`
⚠️  Note: This script requires authentication. 
   You need to be logged in as a user with appropriate permissions.
   
   For best results:
   1. Log in to the application in your browser
   2. Use the "Re-parse Data" button in the Growth Tracking page
   
   Or update this script with a valid session token.
`);

// Run the reparse
reparseAllFeedback();