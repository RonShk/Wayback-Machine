import React, { useState } from 'react';

const HomePage: React.FC = () => {
  const [url, setUrl] = useState('');

  const handleArchive = () => {
    if (url.trim()) {
      // TODO: Implement archive functionality
      console.log('Archiving URL:', url);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleArchive();
    }
  };

  return (
    <div className="flex flex-col items-center bg-white px-8 pt-16 min-h-full">
      <div className="w-full max-w-4xl text-center">
        {/* Main heading */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-normal text-black mb-6">
          Archive the Web
        </h1>
        
        {/* Subtitle */}
        <p className="text-lg md:text-xl text-gray-600 mb-16 max-w-2xl mx-auto">
          Capture and preserve websites for future generations. Enter any URL to create a snapshot.
        </p>
        
        {/* URL input with button inside */}
        <div className="relative max-w-3xl mx-auto">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Enter website URL (e.g., https://example.com)"
            className="w-full px-6 py-4 pl-12 pr-32 text-lg text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM11 19.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>
            </svg>
          </div>
          <button
            onClick={handleArchive}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none transition-colors"
          >
            Archive Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;