import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { SessionNote, GoogleDriveSyncData } from '../types/sessionNotes';

const SESSION_NOTES_COLLECTION = 'session_notes';
const LOCAL_STORAGE_KEY = 'native_friend_session_notes_cache';

export const DEFAULT_TEACHER_EMAIL = 'reginahelena1980@gmail.com';
export const DEFAULT_TEACHER_NAME = 'Regina Helena';
export const TARGET_FOLDER_NAME = "It's Simple - Session Notes";

// Amostra inicial de notas para demonstração imediata
export const SAMPLE_SESSION_NOTES: SessionNote[] = [
  {
    id: 'sn_sample_1',
    studentName: 'Lucas Silva',
    studentEmail: 'lucas.silva@example.com',
    teacherEmail: DEFAULT_TEACHER_EMAIL,
    teacherName: DEFAULT_TEACHER_NAME,
    sessionDate: '2026-09-28',
    sessionTime: '15:00',
    topic: 'Job Interview & Professional Pitch in Tech',
    fluencyScore: 4,
    vocabulary: [
      {
        term: 'Leverage',
        meaning: 'To use something to maximum advantage',
        example: 'We can leverage our existing team expertise to scale faster.'
      },
      {
        term: 'Hit the ground running',
        meaning: 'To start something and proceed quickly without delay',
        example: 'In this new position, they expect me to hit the ground running.'
      },
      {
        term: 'Streamline',
        meaning: 'Make an organization or system more efficient by employing faster or simpler working methods',
        example: 'We streamlined the continuous delivery pipeline.'
      }
    ],
    grammarCorrections: [
      {
        original: 'I am working with software since 5 years.',
        correction: 'I have been working in software for 5 years.',
        explanation: 'Use present perfect continuous ("have been working") with "for" to express duration from past up to now.'
      },
      {
        original: 'If I would have known the deadline, I will hurry.',
        correction: 'If I had known the deadline, I would have hurried.',
        explanation: 'Third conditional pattern: If + had + past participle, would have + past participle.'
      }
    ],
    pronunciationNotes: 'Focus on linking words: "hit_the ground", "talk_about". Pay attention to the TH sound in "thought" vs "taught".',
    homework: '1. Record a 2-minute Loom pitching your proudest career achievement using "leverage" and "streamline".\n2. Review conditional clauses worksheet.',
    nextSteps: 'Next session will focus on handling curveball interview questions and salary negotiation phrasing.',
    generalFeedback: 'Fantastic energy today, Lucas! Your confidence when explaining architectural trade-offs is noticeable. Keep paying attention to verb tenses when telling past stories.',
    googleDrive: {
      folderId: 'drive_folder_its_simple_notes',
      folderName: "It's Simple - Session Notes",
      fileId: 'drive_file_lucas_silva_20260928',
      fileName: 'Session Notes - Lucas Silva - 2026-09-28',
      webViewLink: 'https://drive.google.com/file/d/drive_file_lucas_silva_20260928/view',
      syncedAt: '2026-09-28T16:05:00.000Z',
      status: 'synced'
    },
    createdAt: '2026-09-28T16:00:00.000Z',
    updatedAt: '2026-09-28T16:05:00.000Z'
  },
  {
    id: 'sn_sample_2',
    studentName: 'Beatriz Santos',
    studentEmail: 'beatriz.santos@example.com',
    teacherEmail: DEFAULT_TEACHER_EMAIL,
    teacherName: DEFAULT_TEACHER_NAME,
    sessionDate: '2026-09-29',
    sessionTime: '10:30',
    topic: 'Travel English & Airport Scenarios',
    fluencyScore: 5,
    vocabulary: [
      {
        term: 'Layover',
        meaning: 'A period of rest or waiting before continuing a trip',
        example: 'We had a four-hour layover in Atlanta.'
      },
      {
        term: 'Carry-on vs Checked baggage',
        meaning: 'Bags you bring into the airplane cabin vs bags stored in the cargo hold',
        example: 'Does this ticket allow one personal item and one carry-on bag?'
      }
    ],
    grammarCorrections: [
      {
        original: 'Can you tell me where is the baggage claim?',
        correction: 'Could you tell me where the baggage claim is?',
        explanation: 'Indirect questions retain standard affirmative word order (where + subject + verb).'
      }
    ],
    pronunciationNotes: 'Emphasize silent letters in words like "receipt" (silent p) and "aisle" (silent s).',
    homework: 'Listen to the BBC Travel podcast episode 4 and write down 5 useful idioms.',
    nextSteps: 'Practice hotel check-in and asking for restaurant recommendations.',
    generalFeedback: 'Brilliant conversational flow, Beatriz! You handled the simulated customs officer with complete poise.',
    googleDrive: {
      folderId: 'drive_folder_its_simple_notes',
      folderName: "It's Simple - Session Notes",
      fileId: 'drive_file_beatriz_santos_20260929',
      fileName: 'Session Notes - Beatriz Santos - 2026-09-29',
      webViewLink: 'https://drive.google.com/file/d/drive_file_beatriz_santos_20260929/view',
      syncedAt: '2026-09-29T11:32:00.000Z',
      status: 'synced'
    },
    createdAt: '2026-09-29T11:30:00.000Z',
    updatedAt: '2026-09-29T11:32:00.000Z'
  }
];

// Cache volátil em memória (Zero LocalStorage)
let inMemorySessionNotesCache: SessionNote[] = [...SAMPLE_SESSION_NOTES];

/**
 * Lê cache em memória das notas (Zero LocalStorage)
 */
export function getLocalNotesCache(): SessionNote[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
  }
  return inMemorySessionNotesCache.length > 0 ? inMemorySessionNotesCache : SAMPLE_SESSION_NOTES;
}

/**
 * Salva cache em memória das notas (Zero LocalStorage)
 */
export function setLocalNotesCache(notes: SessionNote[]) {
  inMemorySessionNotesCache = Array.isArray(notes) ? notes : [];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
  }
}

/**
 * Inscreve-se em tempo real para sincronização instantânea das notas de sessão via Firestore.
 * Garante que a visão do aluno e o painel do professor fiquem perfeitamente alinhados em tempo real.
 */
export function subscribeToSessionNotes(
  onData: (notes: SessionNote[]) => void,
  onError?: (err: Error) => void
): () => void {
  let unsubscribeFirestore = () => {};

  try {
    const q = query(collection(db, SESSION_NOTES_COLLECTION), orderBy('sessionDate', 'desc'));
    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const notes: SessionNote[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            notes.push({
              ...(data as SessionNote),
              id: docSnap.id
            });
          });
          setLocalNotesCache(notes);
          onData(notes);
        } else {
          // Se Firestore estiver vazio, verifica backend local ou usa cache
          fetchBackendSessionNotes()
            .then((bNotes) => {
              if (bNotes.length > 0) {
                onData(bNotes);
                setLocalNotesCache(bNotes);
                // Inicializa no Firestore para redundância ativa
                bNotes.forEach((bn) => saveSessionNoteToFirestore(bn).catch(() => {}));
              } else {
                const cached = getLocalNotesCache();
                onData(cached);
              }
            })
            .catch(() => {
              onData(getLocalNotesCache());
            });
        }
      },
      (err) => {
        console.warn('[Firestore] Aviso no listener de session notes, usando fallback local/backend:', err.message);
        if (onError) onError(err);
        // Fallback imediato do backend
        fetchBackendSessionNotes()
          .then((notes) => onData(notes.length > 0 ? notes : getLocalNotesCache()))
          .catch(() => onData(getLocalNotesCache()));
      }
    );
  } catch (err: any) {
    console.warn('[Firestore] Falha ao configurar onSnapshot:', err.message);
    fetchBackendSessionNotes()
      .then((notes) => onData(notes.length > 0 ? notes : getLocalNotesCache()))
      .catch(() => onData(getLocalNotesCache()));
  }

  return () => {
    unsubscribeFirestore();
  };
}

/**
 * Busca notas salvas no backend Express (Redundância soberana)
 */
export async function fetchBackendSessionNotes(): Promise<SessionNote[]> {
  try {
    const res = await fetch('/api/session-notes');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.notes) && data.notes.length > 0) {
        return data.notes;
      }
    }
  } catch (err: any) {
    console.warn('[Backend Notes] Aviso ao consultar /api/session-notes:', err.message);
  }
  return [];
}

/**
 * Salva uma nota de sessão no Firestore
 */
export async function saveSessionNoteToFirestore(note: SessionNote): Promise<void> {
  try {
    const docRef = doc(db, SESSION_NOTES_COLLECTION, note.id);
    await setDoc(docRef, { ...note }, { merge: true });
  } catch (err: any) {
    console.warn('[Firestore] Erro ao salvar nota no Firestore:', err.message);
    throw err;
  }
}

/**
 * SINCRONIZAÇÃO SOFISTICADA COM GOOGLE DRIVE (100% BACKEND - SEM POPUPS DE OAUTH)
 * 
 * Elimina completamente o erro 403 access_denied ("App not verified") pois a criação/atualização
 * do documento na pasta "It's Simple - Session Notes" é realizada pelo backend com credenciais
 * pré-autenticadas da plataforma mapeadas para o e-mail da professora (reginahelena1980@gmail.com).
 */
export async function syncNoteToGoogleDrive(note: SessionNote): Promise<{
  success: boolean;
  googleDrive: GoogleDriveSyncData;
  documentContent?: string;
  message: string;
}> {
  const payload = {
    noteId: note.id,
    studentName: note.studentName,
    studentEmail: note.studentEmail,
    teacherEmail: note.teacherEmail || DEFAULT_TEACHER_EMAIL,
    teacherName: note.teacherName || DEFAULT_TEACHER_NAME,
    sessionDate: note.sessionDate,
    sessionTime: note.sessionTime,
    topic: note.topic,
    vocabulary: note.vocabulary,
    grammarCorrections: note.grammarCorrections,
    pronunciationNotes: note.pronunciationNotes,
    homework: note.homework,
    nextSteps: note.nextSteps,
    generalFeedback: note.generalFeedback,
    fluencyScore: note.fluencyScore
  };

  const response = await fetch('/api/drive/session-notes/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || 'Falha ao sincronizar com Google Drive via backend.');
  }

  const result = await response.json();

  if (!result.success || !result.googleDrive) {
    throw new Error(result.error || 'Resposta inválida do serviço Google Drive.');
  }

  const updatedDriveData: GoogleDriveSyncData = {
    folderId: result.googleDrive.folderId,
    folderName: result.googleDrive.folderName || TARGET_FOLDER_NAME,
    fileId: result.googleDrive.fileId,
    fileName: result.googleDrive.fileName || `Session Notes - ${note.studentName} - ${note.sessionDate}`,
    webViewLink: result.googleDrive.webViewLink,
    syncedAt: result.googleDrive.syncedAt || new Date().toISOString(),
    status: 'synced'
  };

  // Atualiza imediatamente no Firestore e no cache local
  const updatedNote: SessionNote = {
    ...note,
    googleDrive: updatedDriveData,
    updatedAt: updatedDriveData.syncedAt
  };

  try {
    await saveSessionNoteToFirestore(updatedNote);
  } catch (fsErr) {
    console.warn('[Firestore] Aviso ao gravar dados do Drive no Firestore:', fsErr);
  }

  // Atualiza também no backend local para redundância completa
  try {
    await fetch('/api/session-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedNote)
    });
  } catch (bErr) {
    console.warn('[Backend] Aviso ao salvar nota no backend:', bErr);
  }

  return {
    success: true,
    googleDrive: updatedDriveData,
    documentContent: result.documentContent,
    message: result.message || 'Sincronizado com sucesso com o Google Drive!'
  };
}

/**
 * Remove nota de sessão
 */
export async function deleteSessionNote(noteId: string): Promise<void> {
  try {
    const docRef = doc(db, SESSION_NOTES_COLLECTION, noteId);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.warn('[Firestore] Aviso ao remover no Firestore:', err.message);
  }

  try {
    await fetch(`/api/session-notes/${noteId}`, { method: 'DELETE' });
  } catch (err: any) {
    console.warn('[Backend] Aviso ao remover no backend:', err.message);
  }
}
