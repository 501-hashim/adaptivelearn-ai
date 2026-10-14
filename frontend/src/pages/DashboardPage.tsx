import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import {
  Brain,
  Award,
  Target,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Clock,
  CheckCircle
} from '../components/Icons';

export const DashboardPage: React.FC = () => {
  const { student } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await api.getDashboard();
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-slate-600">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading your learning dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error || 'Unable to load dashboard data.'}
        </div>
      </div>
    );
  }

  const isNewStudent = data.total_quizzes_completed === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
        <div>
          <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Grade {student?.grade || data.grade} Student
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            Welcome, {data.display_name}!
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {isNewStudent
              ? "You haven't completed any quizzes yet. Take a diagnostic quiz to initialize your adaptive learning profile!"
              : "Here is your adaptive progress overview and recommended next focus."}
          </p>
        </div>
        <div>
          <Link
            to="/subjects"
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center space-x-2 text-sm"
          >
            <span>{isNewStudent ? "Take Diagnostic Quiz" : "Start New Quiz"}</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-2">
            <span>Total Quizzes</span>
            <Brain size={16} className="text-brand-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data.total_quizzes_completed}</div>
          <div className="text-xs text-slate-600 mt-1">Attempts recorded</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-2">
            <span>Overall Accuracy</span>
            <Target size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data.overall_accuracy}%</div>
          <div className="text-xs text-slate-600 mt-1">Across all concepts</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-2">
            <span>Weak Concepts</span>
            <AlertCircle size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data.weak_concepts_count}</div>
          <div className="text-xs text-slate-600 mt-1">Needs targeted practice</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-2">
            <span>Strong Concepts</span>
            <Award size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data.strong_concepts_count}</div>
          <div className="text-xs text-slate-600 mt-1">Demonstrated mastery</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Weak Concepts & Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Targeted Recommendations */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <TrendingUp size={20} className="text-brand-600" />
              <span>Recommended Next Actions</span>
            </h2>

            {data.recommendations.length > 0 ? (
              <div className="space-y-3">
                {data.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          {rec.recommendation_type === 'weak_concept' ? 'Gap Detected' : 'Review'}
                        </span>
                        <span className="text-sm font-bold text-slate-900">{rec.concept_name}</span>
                        <span className="text-xs text-slate-600">({rec.subject_name})</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{rec.reason}</p>
                    </div>
                    <Link
                      to={`/quiz-config?subject_id=${rec.subject_id}&chapter_id=${rec.chapter_id}&mode=adaptive`}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm whitespace-nowrap transition-all"
                    >
                      Practice Concept
                    </Link>
                  </div>
                ))}
              </div>
            ) : isNewStudent ? (
              <div className="text-center py-6 text-slate-600 text-sm">
                <p>No recommendations yet. Take your first quiz to generate learning gap insights.</p>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-600 text-sm">
                <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
                <p>All concepts are on track! Explore new chapters or take retention quizzes.</p>
              </div>
            )}
          </div>

          {/* Weak Concepts Requiring Attention */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <AlertCircle size={20} className="text-amber-500" />
              <span>Concepts Needing Practice</span>
            </h2>

            {data.weak_concepts.length > 0 ? (
              <div className="space-y-3">
                {data.weak_concepts.map((concept) => (
                  <div key={concept.concept_id} className="p-4 border border-slate-200 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{concept.concept_name}</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {concept.subject_name} • {concept.chapter_title} • {concept.attempt_count} attempts
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-amber-600">
                        {Math.round(concept.mastery_score * 100)}%
                      </div>
                      <div className="text-xs text-slate-600">Mastery Score</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600">No persistent weak concepts detected.</p>
            )}
          </div>
        </div>

        {/* Right Column: Recent Quizzes & Quick Links */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <Clock size={18} className="text-slate-600" />
              <span>Recent Attempts</span>
            </h2>

            {data.recent_quizzes.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.recent_quizzes.map((quiz) => (
                  <div key={quiz.id} className="py-3 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{quiz.subject_name}</div>
                      <div className="text-xs text-slate-600 capitalize">
                        {quiz.mode} • {quiz.actual_question_count} Questions
                      </div>
                    </div>
                    <div className="text-right">
                      {quiz.status === 'completed' ? (
                        <span className={`text-sm font-bold ${quiz.score! >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {quiz.score}%
                        </span>
                      ) : (
                        <Link
                          to={`/quiz/${quiz.id}`}
                          className="text-xs font-semibold text-brand-600 hover:underline"
                        >
                          Resume
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600">No recent quizzes found.</p>
            )}
          </div>

          {/* Quick Curriculum Link */}
          <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 text-white shadow-sm">
            <BookOpen size={24} className="mb-3 text-brand-100" />
            <h3 className="text-lg font-bold">Grade {student?.grade || data.grade} Curriculum</h3>
            <p className="text-xs text-brand-100 mt-1 mb-4 leading-relaxed">
              Explore chapters in Mathematics and Science to start topic-specific adaptive drills.
            </p>
            <Link
              to="/subjects"
              className="inline-block px-4 py-2 bg-white text-brand-700 font-semibold text-xs rounded-lg shadow-sm hover:bg-brand-50 transition-colors"
            >
              Browse Subjects & Chapters
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
