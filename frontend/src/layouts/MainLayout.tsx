import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Brain, BookOpen, BarChart2, User, LogOut } from '../components/Icons';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { student, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to={student ? "/dashboard" : "/"} className="flex items-center space-x-3">
            <div className="bg-brand-500 text-white p-2 rounded-xl flex items-center justify-center shadow-sm">
              <Brain size={24} />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">AdaptiveLearn <span className="text-brand-600">AI</span></span>
              <span className="hidden sm:inline-block ml-2 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-medium">Smart Practice</span>
            </div>
          </Link>

          {student ? (
            <div className="flex items-center space-x-2 sm:space-x-6">
              <nav className="flex items-center space-x-1 sm:space-x-4">
                <Link
                  to="/dashboard"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center space-x-1.5"
                >
                  <BarChart2 size={16} />
                  <span className="hidden md:inline">Dashboard</span>
                </Link>
                <Link
                  to="/subjects"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center space-x-1.5"
                >
                  <BookOpen size={16} />
                  <span>Subjects</span>
                </Link>
                <Link
                  to="/progress"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center space-x-1.5"
                >
                  <BarChart2 size={16} />
                  <span className="hidden sm:inline">Progress</span>
                </Link>
              </nav>

              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

              <div className="flex items-center space-x-3">
                <Link to="/profile" className="flex items-center space-x-2 text-slate-700 hover:text-slate-900 group">
                  <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs group-hover:bg-slate-300 transition-colors">
                    {student.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium hidden md:inline">{student.display_name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 AdaptiveLearn AI. Designed for school learning & personalized gap assessment.</p>
          <div className="flex space-x-4">
            <span className="text-slate-600">Privacy Notice & Student Safety Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
