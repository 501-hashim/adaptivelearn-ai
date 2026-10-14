import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Subject, Chapter } from '../types';
import { Brain, Sparkles, ArrowRight } from '../components/Icons';

export const QuizConfigPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const [selectedSubject, setSelectedSubject] = useState<string>(searchParams.get('subject_id') || '');
  const [selectedChapter, setSelectedChapter] = useState<string>(searchParams.get('chapter_id') || '');
  const [mode, setMode] = useState<string>(searchParams.get('mode') || 'adaptive');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficultyPreference, setDifficultyPreference] = useState<string>('adaptive');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = async () => {
    try {
      setError(null);
      const data = await api.getSubjects();
      setSubjects(data);
      if (!selectedSubject && data.length > 0) {
        setSelectedSubject(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load subjects.');
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedSubject) {
        setChapters([]);
        return;
      }
      try {
        const data = await api.getChapters(selectedSubject);
        setChapters(data);
      } catch (err) {
        console.error('Failed to load chapters:', err);
      }
    };
    fetchChapters();
  }, [selectedSubject]);

  const handleStartQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) {
      setError('Please select a subject.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const quiz = await api.createQuiz({
        subject_id: selectedSubject,
        chapter_id: selectedChapter || null,
        mode,
        question_count: questionCount,
        difficulty_preference: difficultyPreference,
      });

      navigate(`/quiz/${quiz.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz. Please check availability.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Brain size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Configure Your Quiz</h1>
          <p className="text-sm text-slate-600 mt-1">Customize the scope and parameters for your personalized test</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchSubjects}
              className="ml-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <form onSubmit={handleStartQuiz} className="space-y-6">
          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedChapter('');
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} (Grade {sub.grade})
                </option>
              ))}
            </select>
          </div>

          {/* Chapter */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Chapter (Optional)</label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white"
            >
              <option value="">All Chapters (Subject Wide Diagnostic / Review)</option>
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  Chapter {ch.sequence_no}: {ch.title}
                </option>
              ))}
            </select>
          </div>

          {/* Quiz Mode */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Quiz Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'adaptive', title: 'Adaptive', desc: 'Focuses 60% on weak concepts & adjusts difficulty' },
                { id: 'diagnostic', title: 'Diagnostic', desc: 'Balanced broad coverage across all concepts' },
                { id: 'practice', title: 'Practice', desc: 'Even practice drill on selected scope' },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    mode === m.id
                      ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-bold text-slate-900 mb-1">{m.title}</div>
                  <div className="text-xs text-slate-600 leading-relaxed">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Number of Questions */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Questions</label>
            <div className="flex gap-4">
              {[5, 10, 15].map((cnt) => (
                <button
                  type="button"
                  key={cnt}
                  onClick={() => setQuestionCount(cnt)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    questionCount === cnt
                      ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cnt} Questions
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Preference */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Difficulty Preference</label>
            <select
              value={difficultyPreference}
              onChange={(e) => setDifficultyPreference(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white"
            >
              <option value="adaptive">Adaptive (Engine decides automatically)</option>
              <option value="easy">Foundational (Easy first)</option>
              <option value="medium">Intermediate (Medium focus)</option>
              <option value="hard">Advanced (Challenging questions)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
          >
            <span>{loading ? 'Assembling Adaptive Quiz...' : 'Start Quiz Now'}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
