import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Sparkles, Target, TrendingUp, CheckCircle, ArrowRight } from '../components/Icons';

export const LandingPage: React.FC = () => {
  return (
    <div className="bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-6">
            <Sparkles size={14} />
            <span>AI-Powered Adaptive Learning Engine</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Stop Guessing. Master Every Concept with <span className="text-brand-600">Adaptive Quizzes</span>.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            AdaptiveLearn AI analyzes your performance down to the exact concept, detects knowledge gaps in real-time, and builds custom quizzes that adapt to your speed.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <span>Start Learning Free</span>
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-xl transition-all"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900">How the Adaptive Loop Works</h2>
            <p className="mt-4 text-slate-600">
              Traditional quizzes test memory. AdaptiveLearn AI identifies misunderstandings and guides you step-by-step to mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Diagnostic Quiz</h3>
              <p className="text-sm text-slate-600">
                Begin with a balanced quiz to map your initial understanding across all concepts.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Gap Detection</h3>
              <p className="text-sm text-slate-600">
                Our engine uses Laplace-smoothed scoring to isolate weak concepts and missing prerequisites.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Personalized Next Quiz</h3>
              <p className="text-sm text-slate-600">
                60% of next quiz targets your weak spots with adjusted difficulty and prerequisite review.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center font-bold mb-4">
                4
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Measure Mastery</h3>
              <p className="text-sm text-slate-600">
                Watch concepts advance from Developing to Progressing and Strong on your live dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Concept-Level Tracking</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                No broad grades. We pinpoint exact concepts like <em>Properties of Rational Numbers</em> or <em>Laws of Reflection</em> so you know precisely what to practice.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Brain size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Adaptive Difficulty</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Questions scale dynamically. Start with foundational questions, graduate to medium applications, and tackle complex problem solving.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Retention & Spaced Practice</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                The engine schedules retention checkpoints for strong concepts to ensure permanent recall before exams.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
