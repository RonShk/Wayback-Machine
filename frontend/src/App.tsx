import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import AboutPage from './pages/AboutPage'
import './index.css'

function App() {
  return (
    <Router>
      <div className="w-full h-screen overflow-hidden">
        {/* Sticky Navbar at the top */}
        <Navbar />
        
        {/* Main content area */}
        <div className="w-full h-[calc(100vh-56px)] overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
