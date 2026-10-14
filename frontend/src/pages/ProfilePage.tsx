import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, LogOut, Award, CheckCircle } from '../components/Icons';

export const ProfilePage: React.FC = () => {
  const { student, logout } = useAuth();

  if (!student) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-2xl">
            {student.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{student.display_name}</h1>
            <p className="text-xs text-slate-600 mt-0.5">{student.email}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
              Grade {student.grade} Student
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3">Account Details</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Student ID:</span>
                <span className="font-mono text-slate-800">{student.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Account Status:</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle size={12} /> Active
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Member Since:</span>
                <span className="text-slate-800">{new Date(student.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Student Privacy & Data Protection</h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              AdaptiveLearn AI stores only learning performance logs and concept mastery scores. No sensitive personal data, tracking cookies, or third-party ads are ever used.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={logout}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl text-xs transition-colors flex items-center space-x-1.5"
            >
              <LogOut size={14} />
              <span>Sign Out of Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
