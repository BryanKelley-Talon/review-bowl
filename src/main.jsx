import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './tokens/arena-navy.css'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root'))
// The basketball lab (2026-10-31, engine pass) exists in the dev build only. import.meta.env.DEV is
// false in a production build, so this branch and the lab's code are dropped from what ships.
if (import.meta.env.DEV && location.hash.startsWith('#hoops')) {
  import('./game/HoopsLab.jsx').then(({ default: HoopsLab }) => root.render(<React.StrictMode><HoopsLab /></React.StrictMode>))
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
