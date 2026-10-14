import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ConceptMasteryItem } from '../types';
import {
  TrendingUp,
  Award,
  AlertCircle,
  BarChart2,
  CheckCircle
} from '../components/Icons';

export const ProgressPage: React.FC = () => {
  const [masteries, setMasteries] = useState<ConceptMasteryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMastery = async () => {
      try {
        const data = await api.getMastery();
        setMasteries(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load progress.');
      } finally {
        setLoading(false);
      }
    };
    fetchMastery();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-600">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading your learning progress...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      </div>
    );
  }

  const weakConcepts = masteries.filter((m) => m.classification === 'weak');
  const developingConcepts = masteries.filter((m) => m.classification === 'developing');
  const strongConcepts = masteries.filter((m) => m.classification === 'strong' || m.classification === 'progressing');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Your Learning Progress</h1>
        <p className="text-slate-600 text-sm mt-1">
          Detailed concept-level mastery calculated using Laplace-smoothed accuracy over time.
        </p>
      </div>

      {/* Progress Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Weak Concepts</h2>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
              {weakConcepts.length}
            </span>
          </div>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Concepts with low accuracy (&lt;50%) with multiple recorded attempts. Priority for next adaptive session.
          </p>
          <div className="space-y-2">
            {weakConcepts.length > 0 ? (
              weakConcepts.map((c) => (
                <div key={c.concept_id} className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs">
                  <div className="font-bold text-slate-900">{c.concept_name}</div>
                  <div className="text-slate-600 mt-0.5">{c.subject_name} • {Math.round(c.mastery_score * 100)}% Mastery</div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-600">No persistent weak concepts identified.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Developing Concepts</h2>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
              {developingConcepts.length}
            </span>
          </div>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Concepts in the 50%-70% mastery bracket. Further practice will consolidate understanding.
          </p>
          <div className="space-y-2">
            {developingConcepts.length > 0 ? (
              developingConcepts.map((c) => (
                <div key={c.concept_id} className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-xs">
                  <div className="font-bold text-slate-900">{c.concept_name}</div>
                  <div className="text-slate-600 mt-0.5">{c.subject_name} • {Math.round(c.mastery_score * 100)}% Mastery</div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-600">No developing concepts currently.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Strong Concepts</h2>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              {strongConcepts.length}
            </span>
          </div>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Concepts with &gt;70% smoothed accuracy. Scheduled for periodic retention checks.
          </p>
          <div className="space-y-2">
            {strongConcepts.length > 0 ? (
              strongConcepts.map((c) => (
                <div key={c.concept_id} className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs">
                  <div className="font-bold text-slate-900">{c.concept_name}</div>
                  <div className="text-slate-600 mt-0.5">{c.subject_name} • {Math.round(c.mastery_score * 100)}% Mastery</div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-600">Keep practicing to achieve strong mastery.</p>
            )}
          </div>
        </div>
      </div>

      {/* Comprehensive Mastery Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center space-x-2">
          <BarChart2 size={20} className="text-brand-600" />
          <span>Detailed Concept Performance Log</span>
        </h2>

        {masteries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Concept</th>
                  <th className="pb-3">Subject & Chapter</th>
                  <th className="pb-3">Attempts</th>
                  <th className="pb-3">Correct</th>
                  <th className="pb-3">Smoothed Score</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {masteries.map((m) => (
                  <tr key={m.concept_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 font-bold text-slate-900">{m.concept_name}</td>
                    <td className="py-3.5 text-slate-600">{m.subject_name} • {m.chapter_title}</td>
                    <td className="py-3.5 font-medium text-slate-800">{m.attempt_count}</td>
                    <td className="py-3.5 font-medium text-slate-800">{m.correct_count}</td>
                    <td className="py-3.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-500 h-2 rounded-full"
                            style={{ width: `${Math.round(m.mastery_score * 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-slate-900">{Math.round(m.mastery_score * 100)}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      <span className={`px-2.5 py-1 rounded-full font-semibold uppercase ${
                        m.classification === 'strong' ? 'bg-emerald-100 text-emerald-800' :
                        m.classification === 'progressing' ? 'bg-teal-100 text-teal-800' :
                        m.classification === 'developing' ? 'bg-blue-100 text-blue-800' :
                        m.classification === 'weak' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {m.classification}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-600">
            No mastery records logged yet. Start a quiz to populate your learning profile!
          </div>
        )}
      </div>
    </div>
  );
};
