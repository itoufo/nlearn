import { useEffect } from 'react';
import type { Quiz } from '../data/quiz.types';
import type { DocItem } from '../data/curriculum';
import { QuizPlayer } from './QuizPlayer';
import './QuizModal.css';

interface QuizModalProps {
  quiz: Quiz;
  chapterId?: string;
  nextDoc?: DocItem;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (passed: boolean) => void;
}

export function QuizModal({ quiz, chapterId, nextDoc, isOpen, onClose, onComplete }: QuizModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="quiz-modal-overlay" onClick={onClose}>
      <div className="quiz-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="quiz-modal-close" onClick={onClose} aria-label="閉じる">
          &times;
        </button>
        <QuizPlayer quiz={quiz} chapterId={chapterId} nextDoc={nextDoc} onComplete={onComplete} onClose={onClose} />
      </div>
    </div>
  );
}
