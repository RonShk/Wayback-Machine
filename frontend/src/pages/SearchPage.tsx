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
}

const SearchPage: React.FC = () => {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/archives/list');
      if (!response.ok) {
        throw new Error('Failed to fetch archives');
      }
      const data = await response.json();
      setArchives(data.archives || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch archives');
    } finally {
      setLoading(false);
    }
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
              onClick={fetchArchives}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
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
          <h1 className="text-3xl font-bold text-black">Archived Websites</h1>
          <button 
            onClick={fetchArchives}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh
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
                onClick={() => archive.status === 'completed' && handleViewArchive(archive.id)}
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

                  {archive.status === 'completed' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                        View Archive
                      </button>
                    </div>
                  )}

                  {archive.status === 'processing' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-center text-yellow-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                        Processing...
                      </div>
                    </div>
                  )}
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
