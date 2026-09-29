import React, { useState } from 'react';
import { 
  SessionNote, 
  VocabularyItem, 
  GrammarCorrection 
} from '../../types/sessionNotes';
import { 
  DEFAULT_TEACHER_EMAIL, 
  DEFAULT_TEACHER_NAME, 
  TARGET_FOLDER_NAME,
  syncNoteToGoogleDrive, 
  saveSessionNoteToFirestore, 
  deleteSessionNote 
} from '../../services/sessionNotesService';
import { 
  CloudCheck, 
  FileText, 
  FolderCheck, 
  ExternalLink, 
  Save, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Search, 
  Calendar, 
  User, 
  BookOpen, 
  Target, 
  Award, 
  Clock, 
  RefreshCw,
  Eye,
  ShieldCheck
} from 'lucide-react';

interface Props {
  notes: SessionNote[];
  onSelectNote?: (note: SessionNote) => void;
  activeNoteId?: string;
}

export function TeacherSessionNotesPanel({ notes, onSelectNote }: Props) {
  // Estado da nota atualmente em edição
  const [currentNote, setCurrentNote] = useState<SessionNote>(() => {
    if (notes && notes.length > 0) return notes[0];
    return {
      id: `sn_${Date.now()}`,
      studentName: 'Lucas Silva',
      studentEmail: 'lucas.silva@example.com',
      teacherEmail: DEFAULT_TEACHER_EMAIL,
      teacherName: DEFAULT_TEACHER_NAME,
      sessionDate: new Date().toISOString().split('T')[0],
      sessionTime: '15:00',
      topic: 'Professional Tech Pitch & Natural Idioms',
      fluencyScore: 5,
      vocabulary: [
        { term: 'Leverage', meaning: 'Use something to maximum advantage', example: 'We can leverage our team strengths.' }
      ],
      grammarCorrections: [
        { original: 'I work with software since 5 years', correction: 'I have been working in software for 5 years', explanation: 'Present perfect continuous for ongoing duration.' }
      ],
      pronunciationNotes: 'Keep working on linked speech and the TH sound.',
      homework: 'Record a 2-minute elevator pitch with the new idioms.',
      nextSteps: 'Handling difficult interview questions next time.',
      generalFeedback: 'Superb focus today! Pronunciation was very fluid.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('all');
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Lista de alunos únicos das notas existentes
  const uniqueStudents = Array.from(new Set(notes.map(n => n.studentName.trim()).filter(Boolean)));

  // Notas filtradas para a barra lateral
  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.sessionDate.includes(searchQuery);
    const matchesStudent = selectedStudentFilter === 'all' || n.studentName.toLowerCase() === selectedStudentFilter.toLowerCase();
    return matchesSearch && matchesStudent;
  });

  // Manipuladores de formulário
  const handleInputChange = (field: keyof SessionNote, value: any) => {
    setCurrentNote(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString()
    }));
  };

  // Vocabulário
  const handleAddVocab = () => {
    setCurrentNote(prev => ({
      ...prev,
      vocabulary: [
        ...prev.vocabulary,
        { term: '', meaning: '', example: '' }
      ]
    }));
  };

  const handleUpdateVocab = (index: number, field: keyof VocabularyItem, value: string) => {
    setCurrentNote(prev => {
      const updated = [...prev.vocabulary];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, vocabulary: updated };
    });
  };

  const handleRemoveVocab = (index: number) => {
    setCurrentNote(prev => ({
      ...prev,
      vocabulary: prev.vocabulary.filter((_, i) => i !== index)
    }));
  };

  // Correções gramaticais
  const handleAddGrammar = () => {
    setCurrentNote(prev => ({
      ...prev,
      grammarCorrections: [
        ...prev.grammarCorrections,
        { original: '', correction: '', explanation: '' }
      ]
    }));
  };

  const handleUpdateGrammar = (index: number, field: keyof GrammarCorrection, value: string) => {
    setCurrentNote(prev => {
      const updated = [...prev.grammarCorrections];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, grammarCorrections: updated };
    });
  };

  const handleRemoveGrammar = (index: number) => {
    setCurrentNote(prev => ({
      ...prev,
      grammarCorrections: prev.grammarCorrections.filter((_, i) => i !== index)
    }));
  };

  // Criar nova nota em branco
  const handleNewNote = () => {
    const newNote: SessionNote = {
      id: `sn_${Date.now()}`,
      studentName: '',
      studentEmail: '',
      teacherEmail: DEFAULT_TEACHER_EMAIL,
      teacherName: DEFAULT_TEACHER_NAME,
      sessionDate: new Date().toISOString().split('T')[0],
      sessionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      topic: '',
      fluencyScore: 5,
      vocabulary: [{ term: '', meaning: '', example: '' }],
      grammarCorrections: [{ original: '', correction: '', explanation: '' }],
      pronunciationNotes: '',
      homework: '',
      nextSteps: '',
      generalFeedback: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCurrentNote(newNote);
    setSyncFeedback(null);
  };

  // Salvar no Firestore e sincronizar com Google Drive via Backend
  const handleSaveAndSync = async () => {
    if (!currentNote.studentName.trim()) {
      setSyncFeedback({ type: 'error', message: 'Por favor, informe o nome do aluno antes de sincronizar.' });
      return;
    }
    if (!currentNote.topic.trim()) {
      setSyncFeedback({ type: 'error', message: 'Por favor, informe o tópico abordado na aula.' });
      return;
    }

    setIsSyncingDrive(true);
    setSyncFeedback(null);

    try {
      // 1. Salva instantaneamente no Firestore para sincronização em tempo real com o aluno
      await saveSessionNoteToFirestore(currentNote);

      // 2. Dispara a sincronização 100% backend com o Google Drive (Zero-popup / sem erro 403 access_denied)
      const driveResult = await syncNoteToGoogleDrive(currentNote);

      // 3. Atualiza estado da nota com as informações recebidas do Google Drive
      setCurrentNote(prev => ({
        ...prev,
        googleDrive: driveResult.googleDrive
      }));

      setSyncFeedback({
        type: 'success',
        message: `Salvo no Firestore & Google Drive! Arquivo "${driveResult.googleDrive.fileName}" atualizado na pasta "${TARGET_FOLDER_NAME}".`
      });
    } catch (err: any) {
      console.error('Erro na sincronização:', err);
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Erro ao sincronizar com Google Drive. Verifique a conexão com o servidor.'
      });
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (confirm('Tem certeza de que deseja remover esta nota de sessão?')) {
      await deleteSessionNote(noteId);
      if (currentNote.id === noteId) {
        handleNewNote();
      }
    }
  };

  const handleCopyLink = () => {
    if (currentNote.googleDrive?.webViewLink) {
      navigator.clipboard.writeText(currentNote.googleDrive.webViewLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyNotesAsMarkdown = () => {
    const md = `# It's Simple - Native Friend Session Notes
**Student:** ${currentNote.studentName}
**Teacher:** ${currentNote.teacherName} (${currentNote.teacherEmail})
**Date:** ${currentNote.sessionDate}
**Topic:** ${currentNote.topic}

## 📖 Vocabulary
${currentNote.vocabulary.map(v => `- **${v.term}**: ${v.meaning} ${v.example ? `*("${v.example}")*` : ''}`).join('\n')}

## 🎯 Grammar Corrections
${currentNote.grammarCorrections.map(g => `- ❌ ${g.original}\n  ✅ ${g.correction}\n  💡 ${g.explanation || ''}`).join('\n')}

## 🗣️ Pronunciation Notes
${currentNote.pronunciationNotes || 'None'}

## 📝 Homework
${currentNote.homework || 'None'}

## 💡 Teacher Feedback
${currentNote.generalFeedback || 'None'}
`;
    navigator.clipboard.writeText(md);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* CABEÇALHO DO PAINEL DO PROFESSOR */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl mb-8 border border-emerald-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Native Friend • It's Simple
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                Zero-Popup Backend Sync (No 403 Access Denied)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Teacher Session Notes Manager
            </h1>
            <p className="text-emerald-100/80 text-sm max-w-2xl">
              Gerencie notas pedagógicas com sincronização direta no <strong>Google Drive</strong> na pasta <code className="bg-emerald-950/60 px-2 py-0.5 rounded text-emerald-200">{TARGET_FOLDER_NAME}</code> e persistência em tempo real no <strong>Firestore</strong>.
            </p>
          </div>

          {/* Card de Informações da Professora e Drive */}
          <div className="bg-slate-950/40 backdrop-blur-md rounded-2xl p-4 border border-emerald-500/30 text-xs space-y-2 min-w-[280px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Professora:</span>
              <span className="font-semibold text-white">{DEFAULT_TEACHER_NAME}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">E-mail:</span>
              <span className="font-mono text-emerald-300">{DEFAULT_TEACHER_EMAIL}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Google Drive:</span>
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <FolderCheck className="w-3.5 h-3.5" /> {TARGET_FOLDER_NAME}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Firestore:</span>
              <span className="text-emerald-300 flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Tempo Real Ativo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK DE SINCRONIZAÇÃO */}
      {syncFeedback && (
        <div className={`p-4 rounded-2xl mb-6 flex items-start gap-3 border shadow-sm transition-all ${
          syncFeedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {syncFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 text-sm font-medium">{syncFeedback.message}</div>
          <button 
            onClick={() => setSyncFeedback(null)} 
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1"
          >
            Fechar
          </button>
        </div>
      )}

      {/* GRID PRINCIPAL: LISTA LATERAL + FORMULÁRIO DE EDIÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA ESQUERDA: LISTA DE SESSÕES ANTERIORES (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Histórico de Aulas ({filteredNotes.length})
              </h2>
              <button
                onClick={handleNewNote}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Aula
              </button>
            </div>

            {/* Campo de Busca */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por aluno ou tópico..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filtro por Aluno */}
            {uniqueStudents.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Filtrar:</span>
                <select
                  value={selectedStudentFilter}
                  onChange={e => setSelectedStudentFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Todos os Alunos ({uniqueStudents.length})</option>
                  {uniqueStudents.map(student => (
                    <option key={student} value={student}>{student}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Lista com Scroll */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhuma nota de sessão encontrada.
                </div>
              ) : (
                filteredNotes.map(note => {
                  const isSelected = note.id === currentNote.id;
                  const isDriveSynced = Boolean(note.googleDrive?.fileId);

                  return (
                    <div
                      key={note.id}
                      onClick={() => {
                        setCurrentNote(note);
                        setSyncFeedback(null);
                        if (onSelectNote) onSelectNote(note);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-500 shadow-sm'
                          : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          {note.studentName || 'Aluno'}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {note.sessionDate}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 line-clamp-1 mb-2 font-medium">
                        {note.topic || 'Sem tópico definido'}
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                        {isDriveSynced ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Drive Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            Sync Pendente
                          </span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(note.id);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                          title="Excluir nota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: FORMULÁRIO EDITÁVEL DA SESSÃO (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
            
            {/* CABEÇALHO DO FORMULÁRIO & AÇÕES PRINCIPAIS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Editor de Session Notes
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID: <span className="font-mono text-slate-700">{currentNote.id}</span>
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap items-center gap-2">
                {currentNote.googleDrive?.webViewLink && (
                  <a
                    href={currentNote.googleDrive.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    Abrir no Drive
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  Prévia
                </button>

                <button
                  type="button"
                  onClick={handleCopyNotesAsMarkdown}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  {copiedText ? 'Copiado!' : 'Copiar Texto'}
                </button>

                {/* BOTÃO MESTRE: SALVAR & SINCRONIZAR COM GOOGLE DRIVE */}
                <button
                  type="button"
                  onClick={handleSaveAndSync}
                  disabled={isSyncingDrive}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs md:text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSyncingDrive ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sincronizando no Drive...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar & Sync Google Drive
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* STATUS DA SINCRONIZAÇÃO GOOGLE DRIVE DO ARQUIVO ATUAL */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Destino Google Drive:</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Pasta: {TARGET_FOLDER_NAME}
                  </span>
                </div>
                <div className="text-xs text-slate-600 font-mono">
                  Arquivo: Session Notes - {currentNote.studentName || '[Aluno]'} - {currentNote.sessionDate || '[Data]'}
                </div>
              </div>

              {currentNote.googleDrive?.status === 'synced' ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Sincronizado no Drive
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="text-xs text-slate-500 hover:text-emerald-700 underline flex items-center gap-1"
                  >
                    {copiedLink ? 'Link copiado!' : 'Copiar link'}
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Pendente de sincronização
                </span>
              )}
            </div>

            {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS DA SESSÃO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Aluno *
                </label>
                <input
                  type="text"
                  value={currentNote.studentName}
                  onChange={e => handleInputChange('studentName', e.target.value)}
                  placeholder="Ex: Lucas Silva"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail do Aluno
                </label>
                <input
                  type="email"
                  value={currentNote.studentEmail || ''}
                  onChange={e => handleInputChange('studentEmail', e.target.value)}
                  placeholder="aluno@email.com"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data da Aula *
                </label>
                <input
                  type="date"
                  value={currentNote.sessionDate}
                  onChange={e => handleInputChange('sessionDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Horário
                </label>
                <input
                  type="time"
                  value={currentNote.sessionTime || ''}
                  onChange={e => handleInputChange('sessionTime', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* SEÇÃO 2: TÓPICO DA AULA & NOTA DE FLUÊNCIA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tópico Central / Objetivo da Conversa *
                </label>
                <input
                  type="text"
                  value={currentNote.topic}
                  onChange={e => handleInputChange('topic', e.target.value)}
                  placeholder="Ex: Business Meeting Negotiation & Natural Disagreements"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Avaliação de Fluência
                </label>
                <select
                  value={currentNote.fluencyScore || 5}
                  onChange={e => handleInputChange('fluencyScore', Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ Excelente (5/5)</option>
                  <option value={4}>⭐⭐⭐⭐ Muito Boa (4/5)</option>
                  <option value={3}>⭐⭐⭐ Boa / Em Desenvolvimento (3/5)</option>
                  <option value={2}>⭐⭐ Básica (2/5)</option>
                  <option value={1}>⭐ Inicial (1/5)</option>
                </select>
              </div>
            </div>

            {/* SEÇÃO 3: VOCABULÁRIO & EXPRESSÕES IDIOMÁTICAS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  1. Vocabulário & Expressões Trabalhadas ({currentNote.vocabulary.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddVocab}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Termo
                </button>
              </div>

              <div className="space-y-3">
                {currentNote.vocabulary.map((vocab, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">Termo #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveVocab(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remover termo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={vocab.term}
                        onChange={e => handleUpdateVocab(idx, 'term', e.target.value)}
                        placeholder="Palavra ou Expressão (ex: Call it a day)"
                        className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                      />
                      <input
                        type="text"
                        value={vocab.meaning}
                        onChange={e => handleUpdateVocab(idx, 'meaning', e.target.value)}
                        placeholder="Significado / Tradução no contexto"
                        className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <input
                      type="text"
                      value={vocab.example || ''}
                      onChange={e => handleUpdateVocab(idx, 'example', e.target.value)}
                      placeholder="Exemplo prático de frase falada na aula"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 italic text-slate-600"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO 4: CORREÇÕES GRAMATICAIS & JEITO NATIVO */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  2. Correções Gramaticais & O Jeito Nativo ({currentNote.grammarCorrections.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddGrammar}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Correção
                </button>
              </div>

              <div className="space-y-3">
                {currentNote.grammarCorrections.map((corr, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Correção #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveGrammar(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remover correção"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-rose-700 mb-0.5">
                          ❌ Como o aluno falou:
                        </label>
                        <input
                          type="text"
                          value={corr.original}
                          onChange={e => handleUpdateGrammar(idx, 'original', e.target.value)}
                          placeholder="Ex: I have more interest in this."
                          className="w-full px-3 py-1.5 text-xs bg-rose-50/50 border border-rose-200 rounded-lg text-rose-950 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-700 mb-0.5">
                          ✅ Como um nativo falaria (Natural way):
                        </label>
                        <input
                          type="text"
                          value={corr.correction}
                          onChange={e => handleUpdateGrammar(idx, 'correction', e.target.value)}
                          placeholder="Ex: I'm much more interested in this."
                          className="w-full px-3 py-1.5 text-xs bg-emerald-50/50 border border-emerald-200 rounded-lg text-emerald-950 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={corr.explanation || ''}
                        onChange={e => handleUpdateGrammar(idx, 'explanation', e.target.value)}
                        placeholder="💡 Dica rápida / Explicação da regra gramatical"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO 5: PRONÚNCIA & INTONAÇÃO */}
            <div className="space-y-1 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                3. Dicas de Pronúncia & Entonação
              </label>
              <textarea
                rows={2}
                value={currentNote.pronunciationNotes || ''}
                onChange={e => handleInputChange('pronunciationNotes', e.target.value)}
                placeholder="Ex: Conexão das palavras 'talk about' -> 'tal-kabout'. Cuidado com o som do 'ed' mudo em 'worked'."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* SEÇÃO 6: TAREFA DE CASA (HOMEWORK) & PRÓXIMOS PASSOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Lição de Casa / Prática Recomendada
                </label>
                <textarea
                  rows={3}
                  value={currentNote.homework}
                  onChange={e => handleInputChange('homework', e.target.value)}
                  placeholder="Ex: Gravar um áudio de 1 min no WhatsApp sobre sua rotina usando as 3 novas expressões."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  5. Próximos Passos para a Próxima Aula
                </label>
                <textarea
                  rows={3}
                  value={currentNote.nextSteps || ''}
                  onChange={e => handleInputChange('nextSteps', e.target.value)}
                  placeholder="Ex: Iniciar a simulação de apresentação corporativa e slides em inglês."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* SEÇÃO 7: FEEDBACK GERAL DA PROFESSORA */}
            <div className="space-y-1 pt-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                6. Feedback Geral & Mensagem de Incentivo
              </label>
              <textarea
                rows={3}
                value={currentNote.generalFeedback}
                onChange={e => handleInputChange('generalFeedback', e.target.value)}
                placeholder="Parabéns pela dedicação hoje! Você demonstrou muito mais segurança ao formular perguntas complexas..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* BARRA INFERIOR DE FINALIZAÇÃO */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                {currentNote.updatedAt ? `Última edição: ${new Date(currentNote.updatedAt).toLocaleString('pt-BR')}` : ''}
              </div>

              <button
                type="button"
                onClick={handleSaveAndSync}
                disabled={isSyncingDrive}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSyncingDrive ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sincronizando no Google Drive...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Notas & Sincronizar Google Drive
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DO DOCUMENTO DO GOOGLE DRIVE */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Documento Sincronizado no Google Drive
                </h3>
                <p className="text-xs font-mono text-emerald-700">
                  {TARGET_FOLDER_NAME} / Session Notes - {currentNote.studentName} - {currentNote.sessionDate}.txt
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-2"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 bg-slate-900 text-emerald-300 font-mono text-xs p-5 rounded-2xl whitespace-pre-wrap leading-relaxed">
{`================================================================================
                    IT'S SIMPLE - NATIVE FRIEND
                         SESSION NOTES
================================================================================
Student:         ${currentNote.studentName || 'Student'}
Teacher:         ${DEFAULT_TEACHER_NAME} (${DEFAULT_TEACHER_EMAIL})
Date of Session: ${currentNote.sessionDate}
Time:            ${currentNote.sessionTime || ''}
Topic:           ${currentNote.topic}
Fluency Rating:  ${currentNote.fluencyScore || 5} / 5 ⭐

================================================================================
📖 VOCABULARY & IDIOMATIC EXPRESSIONS
================================================================================
${currentNote.vocabulary.map((v, i) => `${i + 1}. ${v.term.toUpperCase()}\n   Meaning: ${v.meaning}\n   Example: "${v.example || ''}"`).join('\n\n')}

================================================================================
🎯 GRAMMAR & PRONUNCIATION CORRECTIONS
================================================================================
${currentNote.grammarCorrections.map((g, i) => `Correction #${i + 1}:\n  ❌ Original:   "${g.original}"\n  ✅ Native Way: "${g.correction}"\n  💡 Tip:        ${g.explanation || ''}`).join('\n\n')}

================================================================================
🗣️ PRONUNCIATION & INTONATION FOCUS
================================================================================
${currentNote.pronunciationNotes || '(No specific pronunciation notes)'}

================================================================================
📝 HOMEWORK & ACTION ITEMS
================================================================================
${currentNote.homework || '(No homework assigned)'}

================================================================================
🚀 NEXT SESSION TARGETS
================================================================================
${currentNote.nextSteps || '(To be defined next class)'}

================================================================================
💡 TEACHER'S GENERAL FEEDBACK
================================================================================
${currentNote.generalFeedback || 'Great class! Keep practicing!'}

================================================================================
Synchronized seamlessly with Google Drive via Native Friend Platform.
Zero-popup backend synchronization mapped to ${DEFAULT_TEACHER_EMAIL}.
================================================================================`}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleCopyNotesAsMarkdown}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                {copiedText ? 'Copiado!' : 'Copiar Texto'}
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
