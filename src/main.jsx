import React, { Suspense, lazy, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './tokens/arena-navy.css'
import './index.css'

// Two products, one site (BK 2026-10-24 22:30, Leo's order 22:18: "they'll live where review bowl lives").
// #/review-day opens REVIEW DAY, the whole-class formats; everything else opens Skills Review Bowl.
// Each loads as its own bundle, so a review day never downloads the football, and the reverse.
const App = lazy(() => import('./App.jsx'))
const ReviewDay = lazy(() => import('./review-day/ReviewDay.jsx'))

const isReviewDay = () => /^#\/review-day/i.test(window.location.hash)

function Root() {
  const [rd, setRd] = useState(isReviewDay)
  useEffect(() => {
    const onHash = () => setRd(isReviewDay())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return <Suspense fallback={null}>{rd ? <ReviewDay /> : <App />}</Suspense>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
