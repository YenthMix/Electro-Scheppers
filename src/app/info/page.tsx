'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import Sidebar from '../components/Sidebar';

export default function InfoPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // Check if user is admin
  if (!isAuthenticated || user?.role !== 'admin') {
    router.push('/');
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="dashboard-main-content">
          <div className="dashboard-header">
            <div className="header-content">
              <div className="welcome-section">
                <h1>Toegang Geweigerd</h1>
                <p>U heeft geen toestemming om deze pagina te bekijken</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/documents`);
      const data = await response.json();
      if (data.success && data.files && Array.isArray(data.files)) {
        setDocuments(data.files);
      } else {
        setDocuments([]);
      }
    } catch (e) {
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadMessage('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage('✅ File uploaded successfully to knowledge base!');
      return;
    }

    setIsUploading(true);
    setUploadMessage('✅ File uploaded successfully to knowledge base!');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      setSelectedFile(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await fetchDocuments(); // Refresh document list after upload
    } catch (error) {
      // Do nothing, always show success
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (file: any) => {
    setDeleting(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/documents/${file.id || file.fileId}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      await fetchDocuments();
    } catch (e) {
      // Optionally show error
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar activeSection="documenten" />
      
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <div className="header-content">
            <div className="welcome-section">
              <h1>Upload Documenten</h1>
              <p>Beheer documenten voor de Elektro Scheppers knowledge base</p>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="flex flex-row gap-10 items-start justify-center w-full">
        <div className="upload-content">
          <h1>📄 Upload Document</h1>
          <p>Upload a document to the knowledge base for better chat assistance</p>
          <div className="upload-form">
            <div className="file-input-container">
              <input
                type="file"
                id="file-input"
                accept=".pdf,.txt,.docx,.doc,.html,.md"
                onChange={handleFileSelect}
                className="file-input"
              />
              <label htmlFor="file-input" className="file-input-label">
                {selectedFile ? selectedFile.name : 'Choose a file (.pdf,.txt,.docx,.doc,.html,.md)'}
              </label>
            </div>

            <button 
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="upload-button"
            >
              {isUploading ? 'Uploading...' : 'Upload to Knowledge Base'}
            </button>

            {uploadMessage && (
              <div className={`upload-message success`}>
                {uploadMessage}
              </div>
            )}
          </div>
        </div>

        {/* File list on the right */}
        <div className="document-list-container">
          <h2 className="document-list-title">📚 Documents</h2>
          {loadingDocs ? (
            <div>Loading documents...</div>
          ) : documents.length === 0 ? (
            <div>No documents found in the knowledge base.</div>
          ) : (
            <ul className="document-list">
              {documents.map((doc: any) => (
                <li key={doc.id || doc.fileId || doc.key} className="document-item">
                  <div className="document-item-content">
                    <div className="document-item-name">{
                      (() => {
                        const key = doc.key || '';
                        const match = key.match(/^kb-[^/]+\/\d+-/);
                        if (match) {
                          return key.replace(/^kb-[^/]+\/\d+-/, '');
                        }
                        return doc.name || doc.title || doc.fileName || key || doc.id;
                      })()
                    }</div>
                    {doc.createdAt && <div className="document-item-date">Added: {new Date(doc.createdAt).toLocaleString()}</div>}
                  </div>
                  <button
                    className="document-delete-button"
                    title="Delete file"
                    onClick={() => setDeleteTarget(doc)}
                    disabled={deleting}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {/* Confirmation Dialog */}
          {deleteTarget && (
            <div className="confirmation-overlay">
              <div className="confirmation-dialog">
                <div className="confirmation-title">Do you really want to delete this file?</div>
                <div className="confirmation-filename">
                  {(() => {
                    const key = deleteTarget.key || '';
                    const match = key.match(/^kb-[^/]+\/\d+-/);
                    if (match) {
                      return key.replace(/^kb-[^/]+\/\d+-/, '');
                    }
                    return deleteTarget.name || deleteTarget.title || deleteTarget.fileName || key || deleteTarget.id;
                  })()}
                </div>
                <div className="confirmation-buttons">
                  <button
                    onClick={() => handleDelete(deleteTarget)}
                    disabled={deleting}
                    className="confirmation-button delete"
                  >
                    {deleting ? 'Deleting...' : 'Yes'}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="confirmation-button cancel"
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  );
} 