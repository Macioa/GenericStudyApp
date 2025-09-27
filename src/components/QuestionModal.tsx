import React, { useState } from 'react';
import { Modal, Typography, Input, Space, Spin } from 'antd';
import { debugLog, debugError } from '../utils/logger';
import { gradeSubmission } from '../prompts';
import type { CompletedQuestionType, SubmissionInputType } from '../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface QuestionModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (result: CompletedQuestionType) => void;
  subject: string;
  question: string;
  context: string[];
  onAnswerChange?: (answer: string) => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  visible,
  onCancel,
  onOk,
  subject,
  question,
  context,
  onAnswerChange
}) => {
  const [answer, setAnswer] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleOk = async () => {
    if (!answer.trim()) return;
    
    setLoading(true);
    debugLog('QuestionModal submitted with answer:', answer);
    
    try {
      const submission: SubmissionInputType = {
        context,
        question,
        answer: answer.trim()
      };
      
      const result = await gradeSubmission(submission);
      debugLog('Grading completed:', result);
      onOk(result);
      setAnswer(''); // Reset answer after submission
    } catch (error) {
      debugError('Error grading submission:', error);
      // The grading prompt now handles fallbacks internally
      // Just show error to user and don't proceed
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    debugLog('QuestionModal cancelled');
    setAnswer(''); // Reset answer when cancelling
    onCancel();
  };

  return (
    <Modal
      title={<Title level={3} style={{ margin: 0 }}>{subject}</Title>}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={600}
      okText={loading ? "Grading..." : "Submit Answer"}
      cancelText="Cancel"
      destroyOnHidden
      confirmLoading={loading}
      okButtonProps={{ disabled: !answer.trim() }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          {question}
        </Text>
        
        <TextArea
          value={answer}
          onChange={(e) => {
            const newAnswer = e.target.value;
            setAnswer(newAnswer);
            onAnswerChange?.(newAnswer);
          }}
          placeholder="Enter your answer here..."
          rows={8}
          style={{ fontSize: '14px' }}
          disabled={loading}
        />
        
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
            <Text type="secondary" style={{ display: 'block', marginTop: '10px' }}>
              Grading your answer...
            </Text>
          </div>
        )}
      </Space>
    </Modal>
  );
};
