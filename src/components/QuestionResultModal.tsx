import React from 'react';
import { Modal, Typography, Card, Space, Button, Progress } from 'antd';
import type { CompletedQuestionType } from '../types';
import { debugLog } from '../utils/logger';

const { Title, Text } = Typography;

export const QuestionResultModal: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onResubmit: () => void | Promise<void>;
  onContinue: () => void;
  subject: string;
  question: string;
  result: CompletedQuestionType;
  resubmitLoading?: boolean;
}> = ({
  visible,
  onCancel,
  onResubmit,
  onContinue,
  subject,
  question,
  result,
  resubmitLoading = false
}) => {
  const handleResubmit = () => {
    debugLog('Question resubmit requested');
    onResubmit();
  };

  const handleContinue = () => {
    debugLog('Continue to next question');
    onContinue();
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return '#52c41a'; // Green for good scores
    if (score >= 0.6) return '#faad14'; // Orange for medium scores
    return '#ff4d4f'; // Red for poor scores
  };

  const getScoreStatus = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'normal';
    return 'exception';
  };

  const isGradingFailed = result.feedback.includes('Unable to grade answer automatically');

  return (
    <Modal
      title={subject}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="resubmit" onClick={handleResubmit} loading={resubmitLoading}>
          {resubmitLoading ? 'Re-grading...' : 'Resubmit'}
        </Button>,
        ...(isGradingFailed ? [] : [
          <Button key="continue" type="primary" onClick={handleContinue}>
            Continue
          </Button>
        ])
      ]}
      width={600}
      destroyOnClose
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Question Section */}
        <Card title="Question" size="small">
          <Text>{question}</Text>
        </Card>

        {/* Answer Section */}
        <Card title="Your Answer" size="small">
          <Text>{result.answer}</Text>
        </Card>

        {/* Score Section */}
        <Card title="Score" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Progress
              percent={Math.round(result.score * 100)}
              status={getScoreStatus(result.score)}
              strokeColor={getScoreColor(result.score)}
              format={(percent) => `${percent}%`}
            />
            <Text type="secondary">
              {result.score >= 0.8 ? 'Excellent!' : 
               result.score >= 0.6 ? 'Good work!' : 'Keep practicing!'}
            </Text>
          </Space>
        </Card>

        {/* Feedback Section */}
        <Card title="Feedback" size="small">
          <Text>{result.feedback}</Text>
        </Card>
      </Space>
    </Modal>
  );
};
