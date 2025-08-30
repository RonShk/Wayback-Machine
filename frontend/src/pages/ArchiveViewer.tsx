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
}

const ArchiveViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [archive, setArchive] = useState<Archive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchArchiveStatus();
    }
  }, [id]);

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
            <p className="text-yellow-800">
              This archive is not ready for viewing. Status: {archive.status}
            </p>
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
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          {archive.pageCount && <span>Pages: {archive.pageCount}</span>}
          {archive.assetCount && <span>Assets: {archive.assetCount}</span>}
          <span>Archived: {new Date(archive.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

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
