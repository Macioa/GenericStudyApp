import React, { useState, useEffect } from 'react';
import { Modal, Typography, List, Progress, Card, Space, Button } from 'antd';
import type { AppStateType, CompletedQuestionType } from '../types';
import type { StudyModalStateType } from '../types/studyModal';
import { QuestionModal } from './QuestionModal';
import { QuestionResultModal } from './QuestionResultModal';
import { StudyResultModal } from './StudyResultModal';
import { debugLog, debugError } from '../utils/logger';
import { gradeSubmission } from '../prompts';
import type { SubmissionInputType } from '../types';

const { Text } = Typography;

interface StudyModalProps {
  visible: boolean;
  onCancel: () => void;
  appState: AppStateType;
}

export const StudyModal: React.FC<StudyModalProps> = ({
  visible,
  onCancel,
  appState
}) => {
  const [modalState, setModalState] = useState<StudyModalStateType>({
    context: '', // Not used anymore, kept for type compatibility
    remainingQuestions: [...appState.questions],
    completedQuestions: []
  });
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
  const [currentResult, setCurrentResult] = useState<CompletedQuestionType | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [resubmitLoading, setResubmitLoading] = useState<boolean>(false);
  const [isRetry, setIsRetry] = useState<boolean>(false);
  const [studyResultModalVisible, setStudyResultModalVisible] = useState(false);

  // Reset modal state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setModalState({
        context: '', // Not used anymore, kept for type compatibility
        remainingQuestions: [...appState.questions],
        completedQuestions: []
      });
      debugLog('StudyModal state reset for new session:', appState);
    }
  }, [visible, appState]);

  const handleCancel = () => {
    debugLog('StudyModal cancelled');
    onCancel();
  };

  const handleOk = () => {
    debugLog('StudyModal completed with state:', modalState);
    setStudyResultModalVisible(true);
  };

  const handleStudyResultOk = () => {
    debugLog('Study result modal completed, returning to main app');
    setStudyResultModalVisible(false);
    onCancel(); // Return to main app
  };

  const handleStudyResultRetry = () => {
    debugLog('Study session retry requested, resetting to start');
    setStudyResultModalVisible(false);
    // Reset the modal state to start from the beginning
    setModalState({
      context: '', // Not used anymore, kept for type compatibility
      remainingQuestions: [...appState.questions],
      completedQuestions: []
    });
    // Reset other states
    setQuestionModalVisible(false);
    setResultModalVisible(false);
    setCurrentQuestion('');
    setCurrentQuestionIndex(-1);
    setCurrentResult(null);
    setCurrentAnswer('');
    setIsRetry(false);
  };

  const handleAttemptQuestion = (questionIndex: number) => {
    const question = modalState.remainingQuestions[questionIndex];
    setCurrentQuestion(question);
    setCurrentQuestionIndex(questionIndex);
    setIsRetry(false);
    setQuestionModalVisible(true);
    debugLog('Opening question modal for:', question);
  };

  const handleQuestionSubmit = (result: CompletedQuestionType) => {
    setCurrentResult(result);
    setQuestionModalVisible(false);
    setResultModalVisible(true);
    debugLog('Question completed with result:', result);
  };

  const handleResultContinue = () => {
    if (currentResult) {
      setModalState(prev => ({
        ...prev,
        remainingQuestions: isRetry 
          ? prev.remainingQuestions // Don't remove from remaining questions for retries
          : prev.remainingQuestions.filter((_, index) => index !== currentQuestionIndex),
        completedQuestions: [...prev.completedQuestions, currentResult]
      }));
    }
    
    setResultModalVisible(false);
    setCurrentQuestion('');
    setCurrentQuestionIndex(-1);
    setCurrentResult(null);
    setIsRetry(false);
  };

  const handleResultResubmit = async () => {
    if (!currentAnswer.trim() || !currentQuestion) return;
    
    setResubmitLoading(true);
    debugLog('Resubmitting answer for re-grading:', currentAnswer);
    
    try {
      const submission: SubmissionInputType = {
        context: appState.context,
        question: currentQuestion,
        answer: currentAnswer.trim()
      };
      
      const result = await gradeSubmission(submission);
      debugLog('Re-grading completed:', result);
      setCurrentResult(result);
    } catch (error) {
      debugError('Error re-grading submission:', error);
    } finally {
      setResubmitLoading(false);
    }
  };

  const handleRetryQuestion = (completedIndex: number) => {
    const completedQuestion = modalState.completedQuestions[completedIndex];
    setCurrentQuestion(completedQuestion.question);
    setCurrentQuestionIndex(completedIndex);
    setIsRetry(true);
    setQuestionModalVisible(true);
    debugLog('Retrying question:', completedQuestion.question);
  };


  return (
    <Modal
      title={appState.subject || "Study Session"}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={800}
      okText="Complete Session"
      cancelText="Close"
      destroyOnHidden
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Context Section */}
        <Card title="Context" size="small">
          <Text>{appState.context.join('\n')}</Text>
        </Card>

        {/* Progress Section */}
        <Card title="Progress" size="small">
          <Progress
            percent={Math.round((new Set(modalState.completedQuestions.map(q => q.question)).size / appState.questions.length) * 100)}
            status="active"
          />
          <Text type="secondary">
            {new Set(modalState.completedQuestions.map(q => q.question)).size} of {appState.questions.length} questions completed
          </Text>
        </Card>

        {/* Remaining Questions */}
        <Card title={`Remaining Questions (${modalState.remainingQuestions.length})`} size="small">
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <List
              size="small"
              dataSource={modalState.remainingQuestions}
              renderItem={(question, index) => (
                <List.Item
                  actions={[
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={() => handleAttemptQuestion(index)}
                    >
                      Attempt
                    </Button>
                  ]}
                >
                  <Text>{index + 1}. {question}</Text>
                </List.Item>
              )}
            />
          </div>
        </Card>

        {/* Completed Questions */}
        {modalState.completedQuestions.length > 0 && (
          <Card title={`Completed Questions (${modalState.completedQuestions.length})`} size="small">
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <List
                size="small"
                dataSource={modalState.completedQuestions}
                renderItem={(item, index) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="default" 
                        size="small"
                        onClick={() => handleRetryQuestion(index)}
                      >
                        Retry
                      </Button>
                    ]}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>{index + 1}. {item.question}</Text>
                      <Text type="secondary">Score: {Math.round(item.score * 100)}%</Text>
                      <Text>{item.feedback}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          </Card>
        )}
      </Space>

      {/* Question Modal */}
      <QuestionModal
        visible={questionModalVisible}
        onCancel={() => setQuestionModalVisible(false)}
        onOk={handleQuestionSubmit}
        subject={appState.subject || "Study Question"}
        question={currentQuestion}
        context={appState.context}
        onAnswerChange={setCurrentAnswer}
      />

      {/* Result Modal */}
      {currentResult && (
        <QuestionResultModal
          visible={resultModalVisible}
          onCancel={() => setResultModalVisible(false)}
          onResubmit={handleResultResubmit}
          onContinue={handleResultContinue}
          subject={appState.subject || "Study Question"}
          question={currentQuestion}
          result={currentResult}
          resubmitLoading={resubmitLoading}
        />
      )}

      {/* Study Result Modal */}
      <StudyResultModal
        visible={studyResultModalVisible}
        onCancel={() => setStudyResultModalVisible(false)}
        onOk={handleStudyResultOk}
        onRetry={handleStudyResultRetry}
        subject={appState.subject || "Study Session"}
        completedQuestions={modalState.completedQuestions}
        totalQuestions={appState.questions.length}
      />

    </Modal>
  );
};
