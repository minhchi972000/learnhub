import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { CoursePage } from './pages/CoursePage'
import { FlashcardsPage } from './pages/FlashcardsPage'
import { HomePage } from './pages/HomePage'
import { LessonPage } from './pages/LessonPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { QuizPage } from './pages/QuizPage'
import { SummaryPage } from './pages/SummaryPage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/courses/:course', element: <CoursePage /> },
      { path: '/courses/:course/units/:unit/lessons/:lesson', element: <LessonPage /> },
      { path: '/courses/:course/units/:unit/quiz', element: <QuizPage /> },
      { path: '/courses/:course/review', element: <FlashcardsPage /> },
      { path: '/courses/:course/summary', element: <SummaryPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
