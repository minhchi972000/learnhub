// Mirrors backend/src/learnhub/api/schemas.py – keep in sync.

export interface CourseSummary {
  slug: string
  title: string
  description: string
  level: string
  tags: string[]
  unit_count: number
  lesson_count: number
  completed_lessons: number
  card_count: number
  cards_due: number
}

export interface LessonItem {
  slug: string
  title: string
  completed: boolean
}

export interface UnitSummary {
  slug: string
  order: number
  title: string
  summary: string
  lessons: LessonItem[]
  question_count: number
  best_percent: number | null
  card_count: number
}

export interface CourseDetail {
  slug: string
  title: string
  description: string
  level: string
  tags: string[]
  source: string
  lesson_count: number
  completed_lessons: number
  units: UnitSummary[]
}

export interface LessonNav {
  unit: string
  lesson: string
  title: string
}

export interface LessonDetail {
  course: string
  course_title: string
  unit: string
  unit_title: string
  slug: string
  title: string
  markdown: string
  completed: boolean
  prev: LessonNav | null
  next: LessonNav | null
}

export type QuestionType = 'single' | 'multi' | 'true_false' | 'fill'

export interface PublicQuestion {
  id: string
  type: QuestionType
  prompt: string
  options: string[] | null
}

export interface QuizOut {
  course: string
  unit: string
  unit_title: string
  questions: PublicQuestion[]
  attempts: number
  best_percent: number | null
}

/** single → option index, multi → indices, true_false → boolean, fill → text */
export type AnswerValue = number | number[] | boolean | string

export interface QuestionResult {
  id: string
  correct: boolean
  response: AnswerValue | null
  correct_answer: number | number[] | boolean | string[]
  explanation: string
}

export interface QuizResult {
  attempt_id: number
  score: number
  total: number
  percent: number
  results: QuestionResult[]
}

export interface CardOut {
  unit: string
  unit_title: string
  id: string
  front: string
  back: string
  example: string
  is_new: boolean
  reps: number
  interval_days: number
}

export interface DueCards {
  cards: CardOut[]
  due_count: number
  new_count: number
}

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export interface ReviewOut {
  card_id: string
  reps: number
  interval_days: number
  due_at: string
}

export interface AttemptItem {
  unit: string
  unit_title: string
  score: number
  total: number
  percent: number
  created_at: string
}

export interface CourseStats {
  lessons_total: number
  lessons_completed: number
  quiz_units_total: number
  quiz_units_attempted: number
  quiz_average_best_percent: number | null
  cards_total: number
  cards_learned: number
  cards_due: number
  recent_attempts: AttemptItem[]
}

export interface Health {
  status: string
  env: 'dev' | 'demo' | 'prod'
  courses: number
}
