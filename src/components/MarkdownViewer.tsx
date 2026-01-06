import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchSecureContent } from '../lib/contentService';
import './MarkdownViewer.css';

interface MarkdownViewerProps {
  courseSlug: string;
  chapterId: string;
  title?: string;
}

export const MarkdownViewer = ({ courseSlug, chapterId, title }: MarkdownViewerProps) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      setError(null);

      const result = await fetchSecureContent(courseSlug, chapterId);

      if (result.error) {
        setError(result.error);
      } else if (result.content) {
        setContent(result.content);
      }

      setLoading(false);
    };

    loadContent();
  }, [courseSlug, chapterId]);

  if (loading) {
    return (
      <div className="markdown-viewer loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="markdown-viewer error">
        <div className="error-message">
          <h2>コンテンツを読み込めませんでした</h2>
          <p>{error}</p>
          {error.includes('登録が必要') && (
            <a href="/courses" className="enroll-link">
              コースに登録する
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <article className="markdown-viewer">
      {title && <div className="doc-title-bar">{title}</div>}
      <div className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </article>
  );
};
