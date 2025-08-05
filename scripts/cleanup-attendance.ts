#!/usr/bin/env tsx

import { db } from '../src/lib/postgres';

async function clearAttendanceData() {
  try {
    console.log('🗑️  Clearing existing imported attendance data...');
    
    // Delete attendance records from Excel import
    const deleteAttendance = await db.query("DELETE FROM attendances WHERE import_source = 'excel_import'");
    console.log(`Deleted ${deleteAttendance.rowCount} attendance records`);
    
    // Delete class sessions that were auto-created (those with unit_number and lesson_number)
    const deleteSessions = await db.query('DELETE FROM class_sessions WHERE unit_number IS NOT NULL AND lesson_number IS NOT NULL');
    console.log(`Deleted ${deleteSessions.rowCount} auto-created class sessions`);
    
    console.log('✅ Cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  clearAttendanceData();
}
