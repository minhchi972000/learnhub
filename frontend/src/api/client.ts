import type {
  AnswerValue,
  CourseDetail,
  CourseStats,
  CourseSummary,
  DueCards,
  Health,
  LessonDetail,
  LessonItem,
  QuizOut,
  QuizResult,
  Rating,
  ReviewOut,
} from './types'

const BASE = import.meta.env.VITE_API_BASE ?? ''

const LEARNER_KEY = 'learnhub.learner'
let learner: string | null = null

/** Anonymous per-browser id, so visitors of a shared server keep separate progress. */
function learnerId(): string {
  if (learner) return learner
  try {
    learner = localStorage.getItem(LEARNER_KEY)
  } catch {
    // storage blocked (private mode etc.): fall through to a per-tab id
  }
  if (!learner) {
    // randomUUID only exists in secure contexts (https/localhost), not on plain-http LAN addresses.
    learner =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    try {
      localStorage.setItem(LEARNER_KEY, learner)
    } catch {
      // keep the in-memory id
    }
  }
  return learner
}

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
    headers: { 'Content-Type': 'application/json', 'X-Learner': learnerId(), ...init?.headers },
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
  health: () => request<Health>('/api/health'),

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
