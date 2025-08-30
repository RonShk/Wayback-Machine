import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

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

const ArchiveViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [archive, setArchive] = useState<Archive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReArchiving, setIsReArchiving] = useState(false);
  const [versions, setVersions] = useState<Archive[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [reArchiveSuccess, setReArchiveSuccess] = useState<{id: string, version: number} | null>(null);

  useEffect(() => {
    if (id) {
      fetchArchiveStatus();
    }
  }, [id]);

  // Auto-refresh for processing archives
  useEffect(() => {
    if (archive?.status === 'processing') {
      const interval = setInterval(() => {
        fetchArchiveStatus();
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [archive?.status]);

  const fetchArchiveStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/archives/status/${id}`);
      if (!response.ok) {
        throw new Error('Archive not found');
      }
      const archiveData = await response.json();
      setArchive(archiveData);
      
      if (archiveData.status !== 'completed') {
        setError('Archive is not ready for viewing');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch archive');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    navigate('/search');
  };

  const handleReArchive = async () => {
    if (!archive) return;
    
    setIsReArchiving(true);
    try {
      const response = await fetch('http://localhost:3001/api/archives/rearchive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: archive.url }),
      });

      if (!response.ok) {
        throw new Error('Failed to re-archive');
      }

      const result = await response.json();
      
      // Show success message instead of navigating immediately
      setReArchiveSuccess({ id: result.id, version: result.version });
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-archive');
    } finally {
      setIsReArchiving(false);
    }
  };

  const fetchVersions = async () => {
    if (!archive) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/archives/versions?url=${encodeURIComponent(archive.url)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch versions');
      }
      const data = await response.json();
      setVersions(data.versions);
      setShowVersions(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch versions');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !archive) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error: {error || 'Archive not found'}</p>
            <button 
              onClick={handleBackToList}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Archives
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (archive.status !== 'completed') {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {archive.status === 'processing' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                ) : (
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-yellow-800">
                  {archive.status === 'processing' 
                    ? `Archive is still being created... (Version ${archive.version || 1})`
                    : `This archive is not ready for viewing. Status: ${archive.status}`
                  }
                </p>
                {archive.status === 'processing' && (
                  <p className="text-sm text-yellow-600 mt-1">
                    This usually takes 1-2 minutes. You can check back later or return to the archives list.
                  </p>
                )}
                {archive.status === 'failed' && archive.error && (
                  <p className="text-sm text-red-600 mt-1">
                    Error: {archive.error}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <button 
                onClick={handleBackToList}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Back to Archives
              </button>
              {archive.status === 'processing' && (
                <button 
                  onClick={fetchArchiveStatus}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                >
                  Refresh Status
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If archive is ready, display it in an iframe
  const archiveUrl = `http://localhost:3001/api/archives/view/${id}`;

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header with archive info and controls */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToList}
            className="flex items-center px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            ← Back to Archives
          </button>
          <div>
            <h1 className="text-lg font-medium text-gray-900">
              {new URL(archive.url).hostname}
            </h1>
            <p className="text-sm text-gray-500">{archive.url}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {archive.version && <span>Version: {archive.version}</span>}
            {archive.pageCount && <span>Pages: {archive.pageCount}</span>}
            {archive.assetCount && <span>Assets: {archive.assetCount}</span>}
            <span>Archived: {new Date(archive.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchVersions}
              className="flex items-center px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              📅 Version History
            </button>
            <button
              onClick={handleReArchive}
              disabled={isReArchiving}
              className={`flex items-center px-3 py-1 text-sm text-white rounded transition-colors ${
                isReArchiving 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isReArchiving ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                  Re-archiving...
                </>
              ) : (
                '🔄 Re-archive'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Re-archive Success Notification */}
      {reArchiveSuccess && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-green-800">
                <strong>Re-archive started!</strong> Version {reArchiveSuccess.version} is now being created.
              </p>
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={() => navigate(`/archive/${reArchiveSuccess.id}`)}
                  className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200 transition-colors"
                >
                  View New Archive
                </button>
                <button
                  onClick={() => setReArchiveSuccess(null)}
                  className="text-sm text-green-600 hover:text-green-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Version History</h3>
              <button
                onClick={() => setShowVersions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-80">
              {versions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No versions found</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        version.id === archive?.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if (version.id !== archive?.id) {
                          navigate(`/archive/${version.id}`);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">Version {version.version || 1}</span>
                            {version.id === archive?.id && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Current</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Archived: {new Date(version.createdAt).toLocaleString()}
                          </p>
                          {version.completedAt && (
                            <p className="text-sm text-gray-500">
                              Completed: {new Date(version.completedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>Status: <span className={`font-medium ${
                            version.status === 'completed' ? 'text-green-600' :
                            version.status === 'processing' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>{version.status}</span></div>
                          {version.pageCount && <div>Pages: {version.pageCount}</div>}
                          {version.assetCount && <div>Assets: {version.assetCount}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Archive viewer iframe */}
      <div className="flex-1 relative">
        <iframe
          src={archiveUrl}
          className="w-full h-full border-0"
          title={`Archive of ${archive.url}`}
          sandbox="allow-scripts allow-same-origin allow-forms"
          onLoad={() => {
            // Optional: Add any post-load handling here
            console.log('Archive loaded successfully');
          }}
          onError={() => {
            setError('Failed to load archive content');
          }}
        />
      </div>
    </div>
  );
};

export default ArchiveViewer;
