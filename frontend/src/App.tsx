import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import ArchiveViewer from './pages/ArchiveViewer'
import './index.css'

function App() {
  return (
    <Router>
      <Routes>
        {/* Archive viewer gets full screen */}
        <Route path="/archive/:id" element={<ArchiveViewer />} />
        
        {/* Other routes get the navbar layout */}
        <Route path="/*" element={
          <div className="w-full h-screen overflow-hidden">
            {/* Sticky Navbar at the top */}
            <Navbar />
            
            {/* Main content area */}
            <div className="w-full h-[calc(100vh-56px)] overflow-y-auto">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<SearchPage />} />
              </Routes>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  )
}

export default App
