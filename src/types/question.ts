export type QuestionType = "SINGLE" | "MULTIPLE";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface Question {
  id: string;
  stem: string;
  normalizedStem: string;
  type: QuestionType;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswers: string; // "A" or "A,C"
  explanation?: string | null;
  category?: string | null;
  difficulty: Difficulty;
  tags?: string | null;
  wrongCount?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface User {
  id: string;
  username: string;
  name?: string | null;
  createdAt?: string | Date;
}

export interface WrongQuestionRecordItem {
  id: string;
  userId: string;
  questionId: string;
  wrongCount: number;
  lastUserAnswer?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  question: Question;
}

export interface QuestionFormData {
  stem: string;
  type: QuestionType;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswers: string[]; // ["A"] or ["A", "C"]
  explanation?: string;
  category?: string;
  difficulty: Difficulty;
  tags?: string;
}

export interface SimilarMatch {
  id: string;
  stem: string;
  type: QuestionType;
  category?: string | null;
  similarity: number;
  isExact: boolean;
  level: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "EXACT";
}