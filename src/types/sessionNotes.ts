export interface VocabularyItem {
  id?: string;
  term: string;
  meaning: string;
  example?: string;
}

export interface GrammarCorrection {
  id?: string;
  original: string;
  correction: string;
  explanation?: string;
}

export interface GoogleDriveSyncData {
  folderId: string;
  folderName: string;
  fileId: string;
  fileName: string;
  webViewLink: string;
  syncedAt: string;
  status: 'synced' | 'pending' | 'error';
  errorMessage?: string;
}

export interface SessionNote {
  id: string;
  studentId?: string;
  studentName: string;
  studentEmail?: string;
  teacherEmail: string;
  teacherName: string;
  sessionDate: string; // YYYY-MM-DD
  sessionTime?: string;
  topic: string;
  vocabulary: VocabularyItem[];
  grammarCorrections: GrammarCorrection[];
  pronunciationNotes?: string;
  homework: string;
  nextSteps?: string;
  generalFeedback: string;
  fluencyScore?: number; // 1 to 5
  tags?: string[];
  googleDrive?: GoogleDriveSyncData;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email?: string;
  level?: string;
  totalSessions?: number;
  lastSessionDate?: string;
  goals?: string;
}
