'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { notesApi } from '@/lib/api';
import { Note } from '@/types';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Download,
  Calendar,
  Tag,
  FileText,
  Loader2,
  NotebookPen,
} from 'lucide-react';

export default function NotePage() {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const noteId = params.id as string;

  useEffect(() => {
    // Check authentication
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      router.push('/auth');
      return;
    }

    if (noteId) {
      fetchNote();
    }
  }, [noteId, router]);

  const fetchNote = async () => {
    try {
      const noteData = await notesApi.get(noteId);
      setNote(noteData);
    } catch (error) {
      console.error('Error fetching note:', error);
      toast.error('Failed to load note');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!note) return;

    try {
      await notesApi.download(note._id);
      toast.success('Note downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download note');
    }
  };

  const formatContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Headers (ending with :)
      if (trimmedLine.endsWith(':') && trimmedLine.length > 3) {
        return (
          <h3 key={index} className="text-lg font-semibold text-gray-800 mt-6 mb-3 border-b border-gray-200 pb-2">
            {trimmedLine.replace(':', '')}
          </h3>
        );
      }
      
      // Bullet points
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
        return (
          <li key={index} className="ml-4 mb-2 text-gray-700">
            {trimmedLine.replace(/^[•\-*]\s*/, '')}
          </li>
        );
      }
      
      // Numbered lists
      if (trimmedLine.match(/^\d+\.\s/)) {
        return (
          <li key={index} className="ml-4 mb-2 text-gray-700 list-decimal">
            {trimmedLine.replace(/^\d+\.\s*/, '')}
          </li>
        );
      }
      
      // Empty lines
      if (!trimmedLine) {
        return <div key={index} className="h-4"></div>;
      }
      
      // Regular paragraphs
      return (
        <p key={index} className="mb-3 text-gray-700 leading-relaxed">
          {trimmedLine}
        </p>
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <NotebookPen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Note not found</h2>
          <p className="text-gray-500">The note you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              
              <div className="flex items-center">
                <NotebookPen className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {note.title}
                  </h1>
                  <div className="flex items-center space-x-4 mt-1">
                    <p className="text-sm text-gray-500 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Created {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                    {note.tags.length > 0 && (
                      <div className="flex items-center space-x-2">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleDownload}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="prose max-w-none">
            {formatContent(note.content)}
          </div>
        </div>
      </main>
    </div>
  );
}
