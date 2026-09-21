import { Question } from "@/types/question";

let cachedQuestions: Question[] | null = null;

export function getCachedQuestions(): Question[] | null {
  return cachedQuestions;
}

export function setCachedQuestions(questions: Question[]): void {
  cachedQuestions = questions;
}

export function invalidateQuestionsCache(): void {
  cachedQuestions = null;
}
