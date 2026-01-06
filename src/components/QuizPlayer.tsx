import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Quiz, QuizQuestion, QuizAnswer, QuizResult } from '../data/quiz.types';
import type { DocItem } from '../data/curriculum';
import { useQuizSubmit } from '../hooks/useQuizSubmit';
import { useAuth } from '../contexts/AuthContext';
import './QuizPlayer.css';

const PASS_THRESHOLD = 80; // 合格ライン（%）

interface QuizPlayerProps {
  quiz: Quiz;
  chapterId?: string;
  nextDoc?: DocItem;
  onComplete?: (passed: boolean) => void;
  onClose?: () => void;
}

export function QuizPlayer({ quiz, chapterId, nextDoc, onComplete, onClose }: QuizPlayerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitQuiz } = useQuizSubmit();
  const startTimeRef = useRef<number>(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  // Reset start time when quiz begins
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const currentQuestion = quiz.questions[currentIndex];
  const isLastQuestion = currentIndex === quiz.questions.length - 1;

  const handleOptionClick = useCallback((optionId: string) => {
    if (showExplanation) return;

    if (currentQuestion.type === 'single') {
      setSelectedOptions([optionId]);
    } else {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    }
  }, [showExplanation, currentQuestion.type]);

  const checkAnswer = useCallback((question: QuizQuestion, selected: string[]): boolean => {
    const correctIds = question.options
      .filter((opt) => opt.isCorrect)
      .map((opt) => opt.id)
      .sort();
    const selectedSorted = [...selected].sort();

    if (correctIds.length !== selectedSorted.length) return false;
    return correctIds.every((id, idx) => id === selectedSorted[idx]);
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedOptions.length === 0) return;

    const isCorrect = checkAnswer(currentQuestion, selectedOptions);
    const newAnswer: QuizAnswer = {
      questionId: currentQuestion.id,
      selectedOptionIds: selectedOptions,
      isCorrect,
    };

    setAnswers((prev) => [...prev, newAnswer]);
    setShowExplanation(true);
  }, [selectedOptions, currentQuestion, checkAnswer]);

  const handleNext = useCallback(async () => {
    if (isLastQuestion) {
      const allAnswers = [...answers];
      const correctCount = allAnswers.filter((a) => a.isCorrect).length;
      const finalResult: QuizResult = {
        quizId: quiz.id,
        answers: allAnswers,
        correctCount,
        totalCount: quiz.questions.length,
        score: Math.round((correctCount / quiz.questions.length) * 100),
        completedAt: new Date(),
      };
      setResult(finalResult);
      setIsCompleted(true);
      const isPassed = finalResult.score >= PASS_THRESHOLD;

      // Save quiz result to Supabase if user is logged in
      if (user && chapterId) {
        const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const quizAnswers = allAnswers.map((a, idx) => ({
          questionId: a.questionId,
          selectedOption: quiz.questions[idx]?.options.findIndex(
            opt => a.selectedOptionIds.includes(opt.id)
          ) ?? 0,
          isCorrect: a.isCorrect ?? false
        }));

        try {
          await submitQuiz(chapterId, quiz.id, quizAnswers, timeTaken);
        } catch (error) {
          console.error('Failed to save quiz result:', error);
        }
      }

      onComplete?.(isPassed);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptions([]);
      setShowExplanation(false);
    }
  }, [isLastQuestion, answers, quiz, onComplete, user, chapterId, submitQuiz]);

  const handleRetry = useCallback(() => {
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedOptions([]);
    setShowExplanation(false);
    setIsCompleted(false);
    setResult(null);
  }, []);

  const handleNextChapter = useCallback(() => {
    if (nextDoc) {
      onClose?.();
      navigate(`/doc/${nextDoc.id}`);
    }
  }, [nextDoc, navigate, onClose]);

  if (isCompleted && result) {
    const isPassed = result.score >= PASS_THRESHOLD;

    return (
      <div className="quiz-player">
        <div className="quiz-result">
          <h2>結果発表</h2>
          <div className={`result-badge ${isPassed ? 'passed' : 'failed'}`}>
            {isPassed ? '合格' : '不合格'}
          </div>
          <div className="result-score">
            <span className="score-number">{result.score}</span>
            <span className="score-unit">点</span>
          </div>
          <p className="result-detail">
            {result.totalCount}問中 {result.correctCount}問正解（合格ライン: {PASS_THRESHOLD}%）
          </p>
          <div className={`result-message ${isPassed ? 'passed' : ''}`}>
            {isPassed
              ? '合格です！次の章に進むことができます。'
              : 'もう一度教材を確認して、再チャレンジしてみましょう。'}
          </div>
          <div className="result-actions">
            {isPassed && nextDoc ? (
              <button className="btn-next-chapter" onClick={handleNextChapter}>
                次の章へ進む: {nextDoc.title}
              </button>
            ) : (
              <button className="btn-retry" onClick={handleRetry}>
                もう一度挑戦
              </button>
            )}
            {onClose && (
              <button className="btn-close" onClick={onClose}>
                閉じる
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-player">
      <div className="quiz-header">
        <h2>{quiz.title}</h2>
        <div className="quiz-progress">
          <span>問題 {currentIndex + 1} / {quiz.questions.length}</span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="quiz-content">
        <div className="question-container">
          <div className="question-badge">
            {currentQuestion.type === 'single' ? '単一選択' : '複数選択'}
          </div>
          <p className="question-text">{currentQuestion.question}</p>
        </div>

        <div className="options-container">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOptions.includes(option.id);
            const showResult = showExplanation;
            let optionClass = 'option';

            if (isSelected) optionClass += ' selected';
            if (showResult && option.isCorrect) optionClass += ' correct';
            if (showResult && isSelected && !option.isCorrect) optionClass += ' incorrect';

            return (
              <button
                key={option.id}
                className={optionClass}
                onClick={() => handleOptionClick(option.id)}
                disabled={showExplanation}
              >
                <span className="option-id">{option.id.toUpperCase()}</span>
                <span className="option-text">{option.text}</span>
                {showResult && option.isCorrect && (
                  <span className="option-mark correct-mark">✓</span>
                )}
                {showResult && isSelected && !option.isCorrect && (
                  <span className="option-mark incorrect-mark">✗</span>
                )}
              </button>
            );
          })}
        </div>

        {showExplanation && currentQuestion.explanation && (
          <div className="explanation">
            <h4>解説</h4>
            <p>{currentQuestion.explanation}</p>
          </div>
        )}
      </div>

      <div className="quiz-footer">
        {!showExplanation ? (
          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={selectedOptions.length === 0}
          >
            回答する
          </button>
        ) : (
          <button className="btn-next" onClick={handleNext}>
            {isLastQuestion ? '結果を見る' : '次の問題へ'}
          </button>
        )}
      </div>
    </div>
  );
}
