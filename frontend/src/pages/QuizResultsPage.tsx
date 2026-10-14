import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { QuizResult } from '../types';
import {
  Award,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  BookOpen
} from '../components/Icons';

export const QuizResultsPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!quizId) return;
      try {
        const data = await api.getQuizResults(quizId);
        setResult(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load results.');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [quizId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-600">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Calculating your mastery & gap analysis...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error || 'Unable to retrieve quiz results.'}
        </div>
      </div>
    );
  }

  const isPassing = result.score >= 70;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Score Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center">
        <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
          isPassing ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
        }`}>
          <Award size={32} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Quiz Completed!</h1>
        <p className="text-slate-600 text-sm mt-1">Here is how you performed on this session</p>

        <div className="mt-6 flex justify-center items-baseline gap-2">
          <span className="text-5xl font-black text-slate-900">{result.score}%</span>
          <span className="text-sm font-semibold text-slate-600">Final Score</span>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-8 pt-6 border-t border-slate-100 text-xs">
          <div>
            <div className="font-bold text-slate-900 text-base">{result.correct_count}</div>
            <div className="text-slate-600">Correct</div>
          </div>
          <div>
            <div className="font-bold text-slate-900 text-base">{result.incorrect_count}</div>
            <div className="text-slate-600">Incorrect</div>
          </div>
          <div>
            <div className="font-bold text-slate-900 text-base">{result.time_taken_seconds}s</div>
            <div className="text-slate-600">Time Taken</div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to="/dashboard"
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
          >
            Back to Dashboard
          </Link>
          <Link
            to="/subjects"
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-colors flex items-center justify-center space-x-1.5"
          >
            <span>Practice Weak Concepts</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Concept Breakdown & Gap Detection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
          <TrendingUp size={20} className="text-brand-600" />
          <span>Concept-Wise Mastery Impact</span>
        </h2>

        <div className="space-y-4">
          {result.concept_summaries.map((cs) => (
            <div key={cs.concept_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">{cs.concept_name}</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Accuracy: {cs.correct_questions}/{cs.total_questions} ({cs.accuracy_percentage}%)
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">
                    {Math.round(cs.updated_mastery * 100)}%
                  </div>
                  <div className="text-xs text-slate-600">Smoothed Mastery</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                  cs.classification === 'strong' ? 'bg-emerald-100 text-emerald-800' :
                  cs.classification === 'developing' ? 'bg-blue-100 text-blue-800' :
                  cs.classification === 'weak' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {cs.classification}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Identified Gaps Alert */}
        {result.identified_gaps.length > 0 && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
            <div className="flex items-center space-x-2 font-bold text-sm mb-2">
              <AlertCircle size={16} />
              <span>Learning Gaps Detected</span>
            </div>
            <ul className="list-disc list-inside text-xs space-y-1">
              {result.identified_gaps.map((gap, i) => (
                <li key={i}>{gap}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Detailed Question Review & Explanations */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Question-by-Question Review</h2>

        <div className="space-y-6">
          {result.questions.map((q, idx) => {
            const isCorrect = q.is_correct;
            return (
              <div
                key={q.id}
                className={`p-5 rounded-2xl border ${
                  isCorrect ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-600 uppercase">Question {idx + 1} • {q.concept_name}</span>
                  <div className="flex items-center space-x-1.5">
                    {isCorrect ? (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700">
                        <CheckCircle size={14} />
                        <span>Correct</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold text-red-700">
                        <XCircle size={14} />
                        <span>Incorrect</span>
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm font-semibold text-slate-900 mb-4">{q.question_text}</p>

                {/* Option list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {q.options.map((opt) => {
                    const isSelected = q.student_selected_option === opt.id;
                    const isTarget = q.correct_option === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl text-xs flex items-center space-x-2.5 border ${
                          isTarget
                            ? 'bg-emerald-100 border-emerald-300 font-semibold text-emerald-900'
                            : isSelected && !isTarget
                            ? 'bg-red-100 border-red-300 font-semibold text-red-900'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="font-bold">{opt.id}:</span>
                        <span>{opt.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Pedagogical Explanation */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-900 block mb-0.5">Explanation:</strong>
                  {q.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
