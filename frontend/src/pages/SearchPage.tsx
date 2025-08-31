import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Archive {
  id: string;
  url: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  error?: string;
  pageCount?: number;
  assetCount?: number;
  totalSize?: number;
  version?: number;
  originalUrl?: string;
}

const SearchPage: React.FC = () => {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshActive, setAutoRefreshActive] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchArchives();
  }, []);

  // Refresh archives when the page becomes visible (user returns to tab/page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, refreshing archives...');
        fetchArchives(false); // Background refresh when page becomes visible
      }
    };

    const handleFocus = () => {
      console.log('🔄 Window focused, refreshing archives...');
      fetchArchives(false); // Background refresh when window gets focus
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Auto-refresh if there are processing archives
  useEffect(() => {
    const hasProcessingArchives = archives.some(archive => archive.status === 'processing');
    
    if (hasProcessingArchives) {
      console.log('🔄 Starting auto-refresh for processing archives');
      setAutoRefreshActive(true);
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing archives...');
        fetchArchives(false); // Don't show loading spinner for background refresh
      }, 5000); // Check every 5 seconds (faster for better UX)

      return () => {
        console.log('🛑 Stopping auto-refresh');
        setAutoRefreshActive(false);
        clearInterval(interval);
      };
    } else {
      setAutoRefreshActive(false);
    }
  }, [archives]);

  const fetchArchives = async (showLoading: boolean = true, isManualRefresh: boolean = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      if (isManualRefresh) {
        setIsRefreshing(true);
      }
      
      const response = await fetch('http://localhost:3001/api/archives/list');
      if (!response.ok) {
        throw new Error('Failed to fetch archives');
      }
      const data = await response.json();
      setArchives(data.archives || []);
      setError(null); // Clear any previous errors on successful fetch
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch archives');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      if (isManualRefresh) {
        setIsRefreshing(false);
      }
    }
  };

  const handleManualRefresh = () => {
    fetchArchives(false, true); // Don't show main loading, but show refresh state
  };

  const handleViewArchive = (archiveId: string) => {
    navigate(`/archive/${archiveId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-black mb-8">Archived Websites</h1>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-black mb-8">Archived Websites</h1>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error: {error}</p>
            <button 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`mt-2 px-4 py-2 text-white rounded transition-colors ${
                isRefreshing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isRefreshing ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-black">Archived Websites</h1>
            {autoRefreshActive && (
              <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Auto-refreshing
              </div>
            )}
          </div>
          <button 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`px-4 py-2 text-white rounded transition-colors flex items-center ${
              isRefreshing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isRefreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Refreshing...
              </>
            ) : (
              '🔄 Refresh'
            )}
          </button>
        </div>

        {archives.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No archives yet</h3>
            <p className="text-gray-600">Start by archiving a website from the home page.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {archives.map((archive) => (
              <div
                key={archive.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewArchive(archive.id)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {new URL(archive.url).hostname}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{archive.url}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(archive.status)}`}>
                      {archive.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    {archive.version && (
                      <div>Version: {archive.version}</div>
                    )}
                    <div>Created: {formatDate(archive.createdAt)}</div>
                    {archive.completedAt && (
                      <div>Completed: {formatDate(archive.completedAt)}</div>
                    )}
                    {archive.pageCount && (
                      <div>Pages: {archive.pageCount}</div>
                    )}
                    {archive.assetCount && (
                      <div>Assets: {archive.assetCount}</div>
                    )}
                    {archive.error && (
                      <div className="text-red-600">Error: {archive.error}</div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {archive.status === 'completed' && (
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                        View Archive
                      </button>
                    )}

                    {archive.status === 'processing' && (
                      <button className="w-full px-4 py-2 bg-yellow-100 text-yellow-800 rounded border border-yellow-300 cursor-pointer hover:bg-yellow-200 transition-colors">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                          Processing... (Click to view status)
                        </div>
                      </button>
                    )}

                    {archive.status === 'failed' && (
                      <button className="w-full px-4 py-2 bg-red-100 text-red-800 rounded border border-red-300 cursor-pointer hover:bg-red-200 transition-colors">
                        Failed - Click to view details
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
