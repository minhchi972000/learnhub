import type {
  AnswerValue,
  CourseDetail,
  CourseStats,
  CourseSummary,
  DueCards,
  LessonDetail,
  LessonItem,
  QuizOut,
  QuizResult,
  Rating,
  ReviewOut,
} from './types'

const BASE = import.meta.env.VITE_API_BASE ?? ''

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') message = body.detail
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new ApiError(res.status, message)
  }
  return res.json() as Promise<T>
}

const enc = encodeURIComponent
const coursePath = (course: string) => `/api/courses/${enc(course)}`
const unitPath = (course: string, unit: string) => `${coursePath(course)}/units/${enc(unit)}`

export const api = {
  listCourses: () => request<CourseSummary[]>('/api/courses'),

  getCourse: (course: string) => request<CourseDetail>(coursePath(course)),

  getStats: (course: string) => request<CourseStats>(`${coursePath(course)}/stats`),

  getLesson: (course: string, unit: string, lesson: string) =>
    request<LessonDetail>(`${unitPath(course, unit)}/lessons/${enc(lesson)}`),

  setLessonProgress: (course: string, unit: string, lesson: string, completed: boolean) =>
    request<LessonItem>(`${unitPath(course, unit)}/lessons/${enc(lesson)}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ completed }),
    }),

  getQuiz: (course: string, unit: string) => request<QuizOut>(`${unitPath(course, unit)}/quiz`),

  submitQuiz: (course: string, unit: string, answers: Record<string, AnswerValue>) =>
    request<QuizResult>(`${unitPath(course, unit)}/quiz/attempts`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  getDueCards: (course: string, unit?: string, newLimit = 20) => {
    const params = new URLSearchParams({ new_limit: String(newLimit) })
    if (unit) params.set('unit', unit)
    return request<DueCards>(`${coursePath(course)}/flashcards/due?${params}`)
  },

  reviewCard: (course: string, unit: string, cardId: string, rating: Rating) =>
    request<ReviewOut>(`${coursePath(course)}/flashcards/reviews`, {
      method: 'POST',
      body: JSON.stringify({ unit, card_id: cardId, rating }),
    }),
}
