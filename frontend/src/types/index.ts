export interface Student {
  id: string;
  display_name: string;
  email: string;
  grade: number;
  is_active: boolean;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  grade: number;
  syllabus_version: string;
  description: string;
  chapters_count: number;
  mastery_percentage: number | null;
  weak_concepts_count: number;
}

export interface Chapter {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  sequence_no: number;
  concepts_count: number;
  questions_count: number;
  mastery_percentage: number | null;
}

export interface Concept {
  id: string;
  chapter_id: string;
  name: string;
  description: string;
  learning_objective: string;
  question_count: number;
  mastery_score: number | null;
  mastery_status: 'unknown' | 'insufficient_evidence' | 'weak' | 'developing' | 'progressing' | 'strong';
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionClient {
  id: string;
  concept_id: string;
  question_text: string;
  options: QuestionOption[];
  difficulty: number;
  display_order: number;
  marked_for_review: boolean;
  current_selected_option: string | null;
}

export interface QuestionResult {
  id: string;
  concept_id: string;
  concept_name: string;
  question_text: string;
  options: QuestionOption[];
  correct_option: string;
  explanation: string;
  difficulty: number;
  display_order: number;
  student_selected_option: string | null;
  is_correct: boolean;
}

export interface QuizSession {
  id: string;
  subject_id: string;
  subject_name: string;
  chapter_id: string | null;
  chapter_title: string | null;
  mode: 'diagnostic' | 'practice' | 'adaptive';
  difficulty_preference: string;
  requested_question_count: number;
  actual_question_count: number;
  status: 'in_progress' | 'completed';
  started_at: string;
  completed_at: string | null;
  score: number | null;
  time_taken_seconds: number | null;
  questions: QuestionClient[];
}

export interface ConceptPerformanceSummary {
  concept_id: string;
  concept_name: string;
  total_questions: number;
  correct_questions: number;
  accuracy_percentage: number;
  updated_mastery: number;
  classification: string;
}

export interface QuizResult {
  quiz_id: string;
  mode: string;
  score: number;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  time_taken_seconds: number;
  questions: QuestionResult[];
  concept_summaries: ConceptPerformanceSummary[];
  identified_gaps: string[];
  recommendations: string[];
}

export interface ConceptMasteryItem {
  concept_id: string;
  concept_name: string;
  chapter_id: string;
  chapter_title: string;
  subject_id: string;
  subject_name: string;
  mastery_score: number;
  attempt_count: number;
  correct_count: number;
  classification: string;
  last_practiced_at: string;
}

export interface RecommendationItem {
  id: string;
  concept_id: string;
  concept_name: string;
  subject_id: string;
  subject_name: string;
  chapter_id: string;
  chapter_title: string;
  recommendation_type: string;
  reason: string;
  created_at: string;
}

export interface QuizHistoryItem {
  id: string;
  subject_id: string;
  subject_name: string;
  chapter_id: string | null;
  chapter_title: string | null;
  mode: string;
  status: string;
  score: number | null;
  actual_question_count: number;
  started_at: string;
  completed_at: string | null;
}

export interface DashboardSummary {
  student_id: string;
  display_name: string;
  grade: number;
  total_quizzes_completed: number;
  overall_accuracy: number;
  weak_concepts_count: number;
  developing_concepts_count: number;
  strong_concepts_count: number;
  weak_concepts: ConceptMasteryItem[];
  recent_quizzes: QuizHistoryItem[];
  recommendations: RecommendationItem[];
  progress_timeline: Array<{ date: string; score: number; mode: string }>;
}
