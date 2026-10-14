import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Chapter, Concept } from '../types';
import { BookOpen, Brain, ArrowRight, ArrowLeft } from '../components/Icons';

export const ChapterConceptPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChapters = async () => {
      if (!subjectId) return;
      try {
        const data = await api.getChapters(subjectId);
        setChapters(data);
        if (data.length > 0) {
          setSelectedChapter(data[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load chapters.');
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, [subjectId]);

  useEffect(() => {
    const fetchConcepts = async () => {
      if (!selectedChapter) return;
      setLoadingConcepts(true);
      try {
        const data = await api.getConcepts(selectedChapter);
        setConcepts(data);
      } catch (err) {
        console.error('Failed to load concepts:', err);
      } finally {
        setLoadingConcepts(false);
      }
    };
    fetchConcepts();
  }, [selectedChapter]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-600">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading chapters...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      </div>
    );
  }

  const activeChapterData = chapters.find((c) => c.id === selectedChapter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link to="/subjects" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-3">
          <ArrowLeft size={14} />
          <span>Back to Subjects</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Chapters & Concepts</h1>
        <p className="text-slate-600 text-sm mt-1">Review specific syllabus units and begin focused practice quizzes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chapters List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Chapters</h2>
          {chapters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChapter(ch.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedChapter === ch.id
                  ? 'border-brand-500 bg-white ring-2 ring-brand-100 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-semibold text-brand-600 mb-0.5">Chapter {ch.sequence_no}</div>
              <div className="text-sm font-bold text-slate-900">{ch.title}</div>
              <div className="flex justify-between items-center mt-3 text-xs text-slate-600">
                <span>{ch.concepts_count} Concepts</span>
                <span>{ch.mastery_percentage !== null ? `${ch.mastery_percentage}% Mastery` : 'Untested'}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Selected Chapter Details & Concepts */}
        <div className="lg:col-span-2">
          {activeChapterData && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div>
                  <div className="text-xs font-semibold text-brand-600 uppercase">Chapter {activeChapterData.sequence_no}</div>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">{activeChapterData.title}</h2>
                  <p className="text-xs text-slate-600 mt-1">{activeChapterData.description}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/quiz-config?subject_id=${subjectId}&chapter_id=${activeChapterData.id}&mode=diagnostic`}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Diagnostic
                  </Link>
                  <Link
                    to={`/quiz-config?subject_id=${subjectId}&chapter_id=${activeChapterData.id}&mode=adaptive`}
                    className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center space-x-1"
                  >
                    <span>Adaptive Quiz</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-900 mb-4">Underlying Concepts</h3>

              {loadingConcepts ? (
                <div className="py-8 text-center text-xs text-slate-600">Loading concepts...</div>
              ) : (
                <div className="space-y-4">
                  {concepts.map((cp) => (
                    <div key={cp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-start">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{cp.name}</div>
                        <div className="text-xs text-slate-600 mt-1">{cp.description}</div>
                        <div className="text-xs text-brand-700 mt-1.5 font-medium">
                          Goal: {cp.learning_objective}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                          cp.mastery_status === 'strong' ? 'bg-emerald-100 text-emerald-800' :
                          cp.mastery_status === 'developing' ? 'bg-blue-100 text-blue-800' :
                          cp.mastery_status === 'weak' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {cp.mastery_status}
                        </span>
                        <div className="text-xs text-slate-600 mt-1">
                          {cp.question_count} questions
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
