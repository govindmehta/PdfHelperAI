'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pdfsApi, notesApi, formatFileSize, formatDate } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { PDF, Note } from '@/types';
import toast from 'react-hot-toast';
import {
  Upload,
  FileText,
  MessageCircle,
  Download,
  Trash2,
  Eye,
  LogOut,
  Plus,
  Loader2,
  NotebookPen,
  Calendar,
  Tag,
} from 'lucide-react';

export default function Dashboard() {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pdfs' | 'notes'>('pdfs');
  const router = useRouter();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth');
      return;
    }

    fetchPDFs();
    fetchNotes();
  }, [router]);

  const fetchPDFs = async () => {
    try {
      const data = await pdfsApi.list();
      setPdfs(data);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      toast.error('Failed to load PDFs');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const data = await notesApi.list();
      setNotes(data);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size should be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const uploadedPdf = await pdfsApi.upload(file);
      setPdfs([uploadedPdf, ...pdfs]);
      toast.success('PDF uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload PDF');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeletePDF = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PDF?')) return;

    try {
      await pdfsApi.delete(id);
      setPdfs(pdfs.filter(pdf => pdf._id !== id));
      toast.success('PDF deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete PDF');
    }
  };

  const handleChatWithPDF = (pdfId: string) => {
    router.push(`/chat/${pdfId}`);
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await notesApi.delete(id);
      setNotes(notes.filter(note => note._id !== id));
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Delete note error:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleViewNote = (id: string) => {
    router.push(`/notes/${id}`);
  };

  const handleDownloadNote = async (id: string) => {
    try {
      await notesApi.download(id);
      toast.success('Note downloaded successfully');
    } catch (error) {
      console.error('Download note error:', error);
      toast.error('Failed to download note');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg mb-4 inline-block">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                PDF Helper AI
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-xl">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-700 font-medium">Welcome, {user?.name || 'User'}!</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-500 hover:text-red-500 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Your AI-Powered
            <span className="text-purple-600"> Dashboard</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload and manage your PDF documents, then chat with them using advanced AI technology.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Upload New PDF</h2>
              <p className="text-gray-600 mt-1">Get started by uploading your first document</p>
            </div>
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-3 rounded-xl">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 group">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              {uploading ? (
                <div className="relative">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl animate-pulse opacity-20"></div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Upload className="h-8 w-8 text-white" />
                </div>
              )}
              <p className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                {uploading ? 'Uploading your document...' : 'Click to upload a PDF'}
              </p>
              <p className="text-sm text-gray-500">
                Maximum file size: 10MB • Supported format: PDF
              </p>
            </label>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 mb-8">
          <div className="border-b border-gray-200/50">
            <nav className="flex space-x-8 px-8">
              <button
                onClick={() => setActiveTab('pdfs')}
                className={`py-6 px-2 border-b-2 font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'pdfs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>PDFs ({pdfs.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`py-6 px-2 border-b-2 font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'notes'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <NotebookPen className="h-5 w-5" />
                  <span>Notes ({notes.length})</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'pdfs' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50">
            <div className="px-8 py-6 border-b border-gray-200/50">
              <h2 className="text-2xl font-semibold text-gray-900">
                Your PDFs ({pdfs.length})
              </h2>
              <p className="text-gray-600 mt-1">Manage and interact with your uploaded documents</p>
            </div>

            {pdfs.length === 0 ? (
              <div className="p-16 text-center">
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-3xl inline-block mb-6">
                  <FileText className="h-12 w-12 text-blue-600 mx-auto" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">No PDFs yet</h3>
                <p className="text-gray-500 text-lg">Upload your first PDF to get started with AI-powered analysis!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                {pdfs.map((pdf) => (
                  <div
                    key={pdf._id}
                    className="group bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-blue-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-r from-red-500 to-pink-500 p-2 rounded-lg">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {pdf.originalName}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFileSize(pdf.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePDF(pdf._id)}
                        className="text-gray-400 hover:text-red-500 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mb-4 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Uploaded {formatDate(pdf.uploadDate)}
                    </p>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleChatWithPDF(pdf._id)}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Chat
                      </button>
                      <button className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all duration-200 flex items-center justify-center">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50">
            <div className="px-8 py-6 border-b border-gray-200/50">
              <h2 className="text-2xl font-semibold text-gray-900">
                Your Notes ({notes.length})
              </h2>
              <p className="text-gray-600 mt-1">Access and download your AI-generated notes</p>
            </div>

            {notes.length === 0 ? (
              <div className="p-16 text-center">
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-3xl inline-block mb-6">
                  <NotebookPen className="h-12 w-12 text-purple-600 mx-auto" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">No notes yet</h3>
                <p className="text-gray-500 text-lg">Generate notes from your PDFs in the chat section!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                {notes.map((note) => (
                  <div
                    key={note._id}
                    className="group bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-purple-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                          <NotebookPen className="h-6 w-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {note.title}
                          </h3>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {note.content.substring(0, 100)}...
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        className="text-gray-400 hover:text-red-500 transition-colors duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 mb-3">
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-gray-500 mb-4 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(note.createdAt)}
                    </p>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleViewNote(note._id)}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadNote(note._id)}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
