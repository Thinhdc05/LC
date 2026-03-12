import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Problem from './pages/Problem'
import Learn from './pages/Learn'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/problem/:id" element={<Problem />} />
            <Route path="/learn" element={<Learn />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
