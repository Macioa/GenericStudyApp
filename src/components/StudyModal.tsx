import React, { useState, useEffect } from 'react';
import { Modal, Typography, List, Progress, Card, Space, Button } from 'antd';
import type { AppStateType } from '../types';
import type { StudyModalStateType } from '../types/studyModal';
import { QuestionModal } from './QuestionModal';
import { debugLog } from '../utils/logger';

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
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);

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
    onCancel(); // Close modal for now
  };

  const handleAttemptQuestion = (questionIndex: number) => {
    const question = modalState.remainingQuestions[questionIndex];
    setCurrentQuestion(question);
    setCurrentQuestionIndex(questionIndex);
    setQuestionModalVisible(true);
    debugLog('Opening question modal for:', question);
  };

  const handleQuestionSubmit = (answer: string) => {
    const question = currentQuestion;
    const completedQuestion = {
      question,
      score: 1, // Default perfect score for now
      feedback: `Answer: ${answer}`
    };
    
    setModalState(prev => ({
      ...prev,
      remainingQuestions: prev.remainingQuestions.filter((_, index) => index !== currentQuestionIndex),
      completedQuestions: [...prev.completedQuestions, completedQuestion]
    }));
    
    setQuestionModalVisible(false);
    setCurrentQuestion('');
    setCurrentQuestionIndex(-1);
    debugLog('Question completed with answer:', answer);
  };

  const handleRetryQuestion = (completedIndex: number) => {
    const completedQuestion = modalState.completedQuestions[completedIndex];
    setCurrentQuestion(completedQuestion.question);
    setCurrentQuestionIndex(completedIndex);
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
      destroyOnClose
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Context Section */}
        <Card title="Context" size="small">
          <Text>{appState.context.join('\n')}</Text>
        </Card>

        {/* Progress Section */}
        <Card title="Progress" size="small">
          <Progress
            percent={Math.round((modalState.completedQuestions.length / appState.questions.length) * 100)}
            status="active"
          />
          <Text type="secondary">
            {modalState.completedQuestions.length} of {appState.questions.length} questions completed
          </Text>
        </Card>

        {/* Remaining Questions */}
        <Card title={`Remaining Questions (${modalState.remainingQuestions.length})`} size="small">
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
        </Card>

        {/* Completed Questions */}
        {modalState.completedQuestions.length > 0 && (
          <Card title={`Completed Questions (${modalState.completedQuestions.length})`} size="small">
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
      />
    </Modal>
  );
};
