import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { QuizSession } from '../types';
import {
  ArrowLeft,
  ArrowRight,
  Flag,
  CheckCircle,
  AlertCircle,
  Clock
} from '../components/Icons';

export const QuizTakingPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuiz = async () => {
    if (!quizId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getQuiz(quizId);
      if (data.status === 'completed') {
        navigate(`/quiz/${quizId}/results`);
        return;
      }
      setQuiz(data);

      // Pre-fill existing saved answers
      const initialAnswers: Record<string, string> = {};
      const initialFlagged: Record<string, boolean> = {};
      data.questions.forEach((q: any) => {
        if (q.current_selected_option) {
          initialAnswers[q.id] = q.current_selected_option;
        }
        if (q.marked_for_review) {
          initialFlagged[q.id] = true;
        }
      });
      setAnswers(initialAnswers);
      setFlagged(initialFlagged);
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectOption = async (questionId: string, optionId: string) => {
    const newAnswers = { ...answers, [questionId]: optionId };
    setAnswers(newAnswers);

    // Persist progress to backend safely
    if (quizId) {
      try {
        await api.saveResponse(quizId, {
          question_id: questionId,
          selected_option: optionId,
          marked_for_review: flagged[questionId] || false,
        });
      } catch (err) {
        console.error('Failed to auto-save response:', err);
      }
    }
  };

  const handleToggleFlag = async (questionId: string) => {
    const nextFlagged = !flagged[questionId];
    setFlagged((prev) => ({ ...prev, [questionId]: nextFlagged }));

    if (quizId) {
      try {
        await api.saveResponse(quizId, {
          question_id: questionId,
          selected_option: answers[questionId] || null,
          marked_for_review: nextFlagged,
        });
      } catch (err) {
        console.error('Failed to update flagged state:', err);
      }
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quiz || !quizId) return;
    setSubmitting(true);
    setShowConfirmModal(false);

    try {
      const responsesPayload = quiz.questions.map((q) => ({
        question_id: q.id,
        selected_option: answers[q.id] || null,
      }));

      await api.submitQuiz(quizId, {
        responses: responsesPayload,
        total_time_seconds: elapsedSeconds,
      });

      navigate(`/quiz/${quizId}/results`);
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-600">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading questions...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl shadow-sm">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-red-900 mb-2">Quiz Loading Issue</h2>
          <p className="text-sm text-red-700 mb-6 leading-relaxed">{error || 'Quiz not found.'}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={fetchQuiz}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              Retry Loading Quiz
            </button>
            <button
              onClick={() => navigate('/subjects')}
              className="px-5 py-2.5 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-medium transition-colors"
            >
              Back to Subjects
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentIndex];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Quiz Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-50 text-brand-700">
              {quiz.mode} Quiz
            </span>
            <span className="text-sm font-semibold text-slate-900">{quiz.subject_name}</span>
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Question {currentIndex + 1} of {totalQuestions}
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600">
            <Clock size={16} />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-all"
          >
            Submit Quiz
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-2 rounded-full mb-6 overflow-hidden">
        <div
          className="bg-brand-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
        ></div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Difficulty: Level {currentQ.difficulty}
          </span>
          <button
            onClick={() => handleToggleFlag(currentQ.id)}
            className={`flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              flagged[currentQ.id]
                ? 'bg-amber-50 border-amber-300 text-amber-700 font-semibold'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Flag size={14} />
            <span>{flagged[currentQ.id] ? 'Flagged for Review' : 'Mark for Review'}</span>
          </button>
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-6 leading-relaxed">
          {currentQ.question_text}
        </h2>

        {/* Options */}
        <div className="space-y-3 mb-8">
          {currentQ.options.map((option) => {
            const isSelected = answers[currentQ.id] === option.id;
            return (
              <div
                key={option.id}
                onClick={() => handleSelectOption(currentQ.id, option.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center space-x-3.5 ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-200 font-medium'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {option.id}
                </div>
                <div className="text-sm text-slate-800">{option.text}</div>
              </div>
            );
          })}
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-between items-center pt-6 border-t border-slate-100">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-40 flex items-center space-x-1.5 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Previous</span>
          </button>

          <div className="flex gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-md py-1">
            {quiz.questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]);
              const isFlag = Boolean(flagged[q.id]);
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'ring-2 ring-brand-500 bg-slate-900 text-white'
                      : isFlag
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : isAnswered
                      ? 'bg-brand-100 text-brand-800'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {currentIndex < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center space-x-1.5 transition-colors"
            >
              <span>Next</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all"
            >
              Finish
            </button>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Ready to Submit?</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              You have answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions.
              {answeredCount < totalQuestions && (
                <span className="block text-amber-600 mt-1 font-semibold">
                  Warning: You have {totalQuestions - answeredCount} unanswered questions!
                </span>
              )}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Continue Quiz
              </button>
              <button
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
