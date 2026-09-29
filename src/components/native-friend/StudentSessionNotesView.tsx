import React, { useState } from 'react';
import { SessionNote } from '../../types/sessionNotes';
import { 
  BookOpen, 
  Target, 
  Award, 
  Calendar, 
  User, 
  ExternalLink, 
  Volume2, 
  CheckSquare, 
  Square, 
  Clock, 
  Sparkles, 
  FileText,
  Copy,
  FolderCheck,
  Zap
} from 'lucide-react';

interface Props {
  notes: SessionNote[];
}

export function StudentSessionNotesView({ notes }: Props) {
  // Alunos disponíveis
  const studentNames = Array.from(new Set(notes.map(n => n.studentName.trim()).filter(Boolean)));
  const [selectedStudent, setSelectedStudent] = useState<string>(() => studentNames[0] || 'Lucas Silva');
  
  // Notas filtradas para o aluno selecionado
  const studentNotes = notes.filter(n => n.studentName.toLowerCase() === selectedStudent.toLowerCase());
  
  // Nota selecionada para visualização detalhada
  const [selectedNoteId, setSelectedNoteId] = useState<string>(() => studentNotes[0]?.id || notes[0]?.id || '');
  
  const activeNote = studentNotes.find(n => n.id === selectedNoteId) || studentNotes[0] || notes[0];

  // Tarefas de casa marcadas como concluídas
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [copiedLink, setCopiedLink] = useState(false);

  // Síntese de voz para pronúncia
  const speakTerm = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleTask = (taskIndex: number) => {
    const key = `${activeNote?.id}_${taskIndex}`;
    setCompletedTasks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCopyDriveLink = () => {
    if (activeNote?.googleDrive?.webViewLink) {
      navigator.clipboard.writeText(activeNote.googleDrive.webViewLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (!activeNote) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Nenhuma nota de aula disponível ainda</h2>
        <p className="text-slate-500 text-sm mt-1">
          Assim que a professora salvar as notas da sua sessão, elas aparecerão aqui em tempo real.
        </p>
      </div>
    );
  }

  // Divide o texto de homework em itens de lista
  const homeworkItems = activeNote.homework
    ? activeNote.homework.split('\n').filter(line => line.trim().length > 0)
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* CABEÇALHO DO PORTAL DO ALUNO */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl mb-8 border border-blue-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Student Portal • Native Friend
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Sincronização em Tempo Real (Firestore)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              My English Session Notes
            </h1>
            <p className="text-blue-100/80 text-sm max-w-2xl">
              Acesse seu vocabulário, correções de pronúncia, tarefas e o documento oficial sincronizado no <strong>Google Drive</strong>.
            </p>
          </div>

          {/* Seletor do Aluno */}
          <div className="bg-slate-950/40 backdrop-blur-md rounded-2xl p-4 border border-blue-500/30 text-xs space-y-2 min-w-[260px]">
            <label className="block text-slate-300 font-semibold mb-1">
              Selecionar Perfil do Aluno:
            </label>
            <select
              value={selectedStudent}
              onChange={e => {
                setSelectedStudent(e.target.value);
                const firstNoteForStudent = notes.find(n => n.studentName.toLowerCase() === e.target.value.toLowerCase());
                if (firstNoteForStudent) setSelectedNoteId(firstNoteForStudent.id);
              }}
              className="w-full bg-slate-900 border border-blue-400/40 rounded-xl px-3 py-2 text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {studentNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <div className="text-[11px] text-blue-200/70 pt-1 flex items-center justify-between">
              <span>Professora: {activeNote.teacherName || 'Regina Helena'}</span>
              <span>{studentNotes.length} aula(s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* SELETOR DE DATAS / AULAS ANTERIORES */}
      {studentNotes.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Escolher Aula:</span>
          {studentNotes.map(n => {
            const isSelected = n.id === activeNote.id;
            return (
              <button
                key={n.id}
                onClick={() => setSelectedNoteId(n.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {n.sessionDate}
                {n.fluencyScore ? ` • ${n.fluencyScore}⭐` : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* CARD PRINCIPAL DA SESSÃO ATIVA */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-8">
        
        {/* TOPO: TÓPICO, PROFESSOR, DATA E LINK DO GOOGLE DRIVE */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg font-medium text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                {activeNote.sessionDate}
              </span>
              {activeNote.sessionTime && (
                <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg font-medium text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {activeNote.sessionTime}
                </span>
              )}
              <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg font-medium text-slate-700">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Professora: {activeNote.teacherName}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
              {activeNote.topic}
            </h2>

            {activeNote.fluencyScore && (
              <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < (activeNote.fluencyScore || 0) ? 'text-amber-400' : 'text-slate-200'}>
                    ★
                  </span>
                ))}
                <span className="text-xs text-slate-600 ml-1 font-normal">
                  (Fluência na sessão: {activeNote.fluencyScore}/5)
                </span>
              </div>
            )}
          </div>

          {/* BANNER DO GOOGLE DRIVE */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-start gap-2 min-w-[280px]">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <FolderCheck className="w-4 h-4 text-emerald-600" />
              <span>Pasta Google Drive:</span>
            </div>
            <div className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-full truncate">
              {activeNote.googleDrive?.folderName || "It's Simple - Session Notes"}
            </div>

            <div className="flex items-center gap-2 pt-1 w-full">
              {activeNote.googleDrive?.webViewLink ? (
                <a
                  href={activeNote.googleDrive.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir Arquivo no Drive
                </a>
              ) : (
                <span className="text-xs text-amber-600">Sincronizando com Drive...</span>
              )}
              <button
                onClick={handleCopyDriveLink}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
                title="Copiar link do Google Drive"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            {copiedLink && (
              <span className="text-[11px] text-emerald-600 font-medium">Link do Drive copiado!</span>
            )}
          </div>
        </div>

        {/* 1. SEÇÃO DE VOCABULÁRIO & EXPRESSÕES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Vocabulário & Novas Expressões ({activeNote.vocabulary.length})
            </h3>
            <span className="text-xs text-slate-400">Clique no ícone de áudio para ouvir a pronúncia</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeNote.vocabulary.map((vocab, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 hover:border-blue-200 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-base text-blue-950 flex items-center gap-2">
                    <span>{vocab.term}</span>
                    <button
                      onClick={() => speakTerm(vocab.term)}
                      className="p-1.5 rounded-lg bg-blue-100/60 text-blue-700 hover:bg-blue-200 transition-colors"
                      title="Ouvir pronúncia em inglês nativo"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[11px] font-mono text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    #{idx + 1}
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  {vocab.meaning}
                </p>

                {vocab.example && (
                  <div className="pt-2 border-t border-blue-100/60 text-xs text-slate-600 italic">
                    <span className="font-semibold text-blue-800 not-italic">Exemplo:</span> "{vocab.example}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2. SEÇÃO DE CORREÇÕES GRAMATICAIS & JEITO NATIVO */}
        <div className="space-y-4 pt-2">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            Gramática & Expressão Natural (O Jeito Nativo)
          </h3>

          <div className="space-y-3">
            {activeNote.grammarCorrections.map((corr, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                    <span className="font-bold text-rose-800 block mb-1">
                      ❌ Como você falou na aula:
                    </span>
                    <span className="text-rose-950 font-medium">"{corr.original}"</span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-emerald-800">
                        ✅ Como um nativo fala:
                      </span>
                      <button
                        onClick={() => speakTerm(corr.correction)}
                        className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        title="Ouvir frase nativa"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-emerald-950 font-bold">"{corr.correction}"</span>
                  </div>
                </div>

                {corr.explanation && (
                  <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 flex items-start gap-2">
                    <span className="text-blue-600 font-bold">💡 Dica da Professora:</span>
                    <span>{corr.explanation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 3. DICAS DE PRONÚNCIA & ENTONAÇÃO */}
        {activeNote.pronunciationNotes && (
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1">
            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              🗣️ Foco de Pronúncia & Entonação
            </h4>
            <p className="text-xs text-amber-950 leading-relaxed">
              {activeNote.pronunciationNotes}
            </p>
          </div>
        )}

        {/* 4. LIÇÃO DE CASA & PRÓXIMOS PASSOS (CHECKLIST INTERATIVO) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Tarefas */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              Tarefas de Casa & Prática
            </h3>

            {homeworkItems.length > 0 ? (
              <div className="space-y-2">
                {homeworkItems.map((item, idx) => {
                  const isDone = completedTasks[`${activeNote.id}_${idx}`];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleTask(idx)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-xs ${
                        isDone 
                          ? 'bg-emerald-50 border-emerald-200 text-slate-500 line-through' 
                          : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300'
                      }`}
                    >
                      {isDone ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      )}
                      <span className="font-medium leading-relaxed">{item}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 text-slate-500 text-xs">
                Nenhuma lição de casa específica para esta aula. Aproveite para revisar o vocabulário!
              </div>
            )}
          </div>

          {/* Próximos Passos */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Alvos para a Próxima Aula
            </h3>
            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 text-xs text-purple-950 leading-relaxed space-y-2">
              <p>{activeNote.nextSteps || 'Continuar avançando na conversação fluida e natural.'}</p>
            </div>
          </div>
        </div>

        {/* 5. FEEDBACK GERAL DA PROFESSORA REGINA */}
        {activeNote.generalFeedback && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
            <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-700" />
              Mensagem & Feedback da Professora ({activeNote.teacherName})
            </h4>
            <p className="text-xs text-emerald-950 leading-relaxed italic">
              "{activeNote.generalFeedback}"
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
