import { NavLink } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 w-full sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo / Title */}
          <NavLink
            to="/"
            className="flex items-center space-x-2"
          >
            <div className="flex items-center justify-center w-6 h-6 bg-black rounded">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-xl font-semibold text-gray-900">WebArchive</span>
          </NavLink>

          {/* Empty space on the right */}
          <div />
        </div>
      </div>
    </nav>
  )
}
