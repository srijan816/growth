interface OfflineAttendanceEntry {
  id: string;
  course_id: string;
  session_date: string;
  lesson_number: string;
  students: Array<{
    enrollment_id: string;
    student_name: string;
    status: 'present' | 'absent' | 'makeup';
    star_rating_1: number;
    star_rating_2: number;
    star_rating_3: number;
    star_rating_4: number;
    notes?: string;
  }>;
  created_at: string;
  synced: boolean;
}

interface OfflineMakeupEntry {
  id: string;
  entries: Array<{
    student_id: string;
    student_name: string;
    original_enrollment_id: string;
    makeup_class_id: string;
    makeup_class_name: string;
    makeup_session_date: string;
    missed_session_id: string;
    missed_session_date: string;
  }>;
  created_at: string;
  synced: boolean;
}

const STORAGE_KEYS = {
  ATTENDANCE: 'offline_attendance_entries',
  MAKEUP: 'offline_makeup_entries',
  LAST_SYNC: 'last_sync_timestamp',
  CONNECTION_STATUS: 'connection_status'
} as const;

export class OfflineStorage {
  private static instance: OfflineStorage;
  private isOnline: boolean = true;
  private onlineStatusCallbacks: ((status: boolean) => void)[] = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  private handleOnline() {
    this.isOnline = true;
    this.notifyStatusChange(true);
    this.syncAllData();
  }

  private handleOffline() {
    this.isOnline = false;
    this.notifyStatusChange(false);
  }

  private notifyStatusChange(status: boolean) {
    this.onlineStatusCallbacks.forEach(callback => callback(status));
  }

  onStatusChange(callback: (status: boolean) => void) {
    this.onlineStatusCallbacks.push(callback);
    return () => {
      this.onlineStatusCallbacks = this.onlineStatusCallbacks.filter(cb => cb !== callback);
    };
  }

  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  // Attendance Storage Methods
  async saveAttendanceOffline(attendanceData: Omit<OfflineAttendanceEntry, 'id' | 'created_at' | 'synced'>): Promise<string> {
    const entry: OfflineAttendanceEntry = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...attendanceData,
      created_at: new Date().toISOString(),
      synced: false
    };

    const existing = this.getOfflineAttendanceEntries();
    existing.push(entry);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(existing));

    return entry.id;
  }

  getOfflineAttendanceEntries(): OfflineAttendanceEntry[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return stored ? JSON.parse(stored) : [];
  }

  getUnsyncedAttendanceEntries(): OfflineAttendanceEntry[] {
    return this.getOfflineAttendanceEntries().filter(entry => !entry.synced);
  }

  markAttendanceAsSynced(entryId: string) {
    const entries = this.getOfflineAttendanceEntries();
    const updatedEntries = entries.map(entry => 
      entry.id === entryId ? { ...entry, synced: true } : entry
    );
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updatedEntries));
  }

  // Makeup Storage Methods
  async saveMakeupOffline(makeupData: Omit<OfflineMakeupEntry, 'id' | 'created_at' | 'synced'>): Promise<string> {
    const entry: OfflineMakeupEntry = {
      id: `offline_makeup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...makeupData,
      created_at: new Date().toISOString(),
      synced: false
    };

    const existing = this.getOfflineMakeupEntries();
    existing.push(entry);
    localStorage.setItem(STORAGE_KEYS.MAKEUP, JSON.stringify(existing));

    return entry.id;
  }

  getOfflineMakeupEntries(): OfflineMakeupEntry[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.MAKEUP);
    return stored ? JSON.parse(stored) : [];
  }

  getUnsyncedMakeupEntries(): OfflineMakeupEntry[] {
    return this.getOfflineMakeupEntries().filter(entry => !entry.synced);
  }

  markMakeupAsSynced(entryId: string) {
    const entries = this.getOfflineMakeupEntries();
    const updatedEntries = entries.map(entry => 
      entry.id === entryId ? { ...entry, synced: true } : entry
    );
    localStorage.setItem(STORAGE_KEYS.MAKEUP, JSON.stringify(updatedEntries));
  }

  // Sync Methods
  async syncAllData(): Promise<{ success: boolean; errors: string[] }> {
    if (!this.isOnline) {
      return { success: false, errors: ['Device is offline'] };
    }

    const errors: string[] = [];
    let attendanceSuccess = true;
    let makeupSuccess = true;

    // Sync attendance entries
    try {
      await this.syncAttendanceEntries();
    } catch (error) {
      attendanceSuccess = false;
      errors.push(`Attendance sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Sync makeup entries
    try {
      await this.syncMakeupEntries();
    } catch (error) {
      makeupSuccess = false;
      errors.push(`Makeup sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const success = attendanceSuccess && makeupSuccess;
    
    if (success) {
      this.updateLastSyncTime();
    }

    return { success, errors };
  }

  private async syncAttendanceEntries() {
    const unsyncedEntries = this.getUnsyncedAttendanceEntries();
    
    for (const entry of unsyncedEntries) {
      try {
        const response = await fetch('/api/attendance/quick-entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: entry.course_id,
            session_date: entry.session_date,
            lesson_number: entry.lesson_number,
            students: entry.students
          })
        });

        if (response.ok) {
          this.markAttendanceAsSynced(entry.id);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Failed to sync attendance entry:', entry.id, error);
        throw error;
      }
    }
  }

  private async syncMakeupEntries() {
    const unsyncedEntries = this.getUnsyncedMakeupEntries();
    
    for (const entry of unsyncedEntries) {
      try {
        const response = await fetch('/api/makeup/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: entry.entries })
        });

        if (response.ok) {
          this.markMakeupAsSynced(entry.id);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Failed to sync makeup entry:', entry.id, error);
        throw error;
      }
    }
  }

  private updateLastSyncTime() {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  getLastSyncTime(): Date | null {
    if (typeof window === 'undefined') return null;
    const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return timestamp ? new Date(timestamp) : null;
  }

  // Utility Methods
  getPendingSyncCount(): number {
    return this.getUnsyncedAttendanceEntries().length + this.getUnsyncedMakeupEntries().length;
  }

  clearSyncedData() {
    const attendanceEntries = this.getOfflineAttendanceEntries().filter(entry => !entry.synced);
    const makeupEntries = this.getOfflineMakeupEntries().filter(entry => !entry.synced);
    
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceEntries));
    localStorage.setItem(STORAGE_KEYS.MAKEUP, JSON.stringify(makeupEntries));
  }

  clearAllOfflineData() {
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.MAKEUP);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  }
}