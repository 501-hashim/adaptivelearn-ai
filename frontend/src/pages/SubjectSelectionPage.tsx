import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Subject } from '../types';
import { BookOpen, ArrowRight, AlertCircle, CheckCircle } from '../components/Icons';

export const SubjectSelectionPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await api.getSubjects();
        setSubjects(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load subjects.');
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-600">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading subjects...</p>
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Your Enrolled Subjects</h1>
        <p className="text-slate-600 text-sm mt-1">Select a subject to view chapters, concepts, and start targeted quizzes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subjects.map((sub) => (
          <div
            key={sub.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <BookOpen size={24} />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                  Grade {sub.grade}
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-2">{sub.name}</h2>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">{sub.description}</p>

              <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-600">Chapters:</span>{' '}
                  <span className="font-semibold text-slate-800">{sub.chapters_count} Chapters</span>
                </div>
                <div>
                  <span className="text-slate-600">Mastery:</span>{' '}
                  <span className="font-semibold text-slate-800">
                    {sub.mastery_percentage !== null ? `${sub.mastery_percentage}%` : 'Not assessed'}
                  </span>
                </div>
                {sub.weak_concepts_count > 0 && (
                  <div className="col-span-2 text-amber-600 flex items-center space-x-1 font-medium">
                    <AlertCircle size={14} />
                    <span>{sub.weak_concepts_count} concept(s) need practice</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                to={`/quiz-config?subject_id=${sub.id}&mode=diagnostic`}
                className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
              >
                Diagnostic Quiz
              </Link>
              <Link
                to={`/subjects/${sub.id}/chapters`}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <span>Explore Chapters</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
