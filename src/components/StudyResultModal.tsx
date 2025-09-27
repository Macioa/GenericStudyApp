import React from 'react';
import { Modal, Typography, Card, Space, Button, Statistic, Row, Col } from 'antd';
import type { CompletedQuestionType } from '../types';
import { debugLog } from '../utils/logger';

const { Title, Text } = Typography;

interface StudyResultModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: () => void;
  onRetry: () => void;
  subject: string;
  completedQuestions: CompletedQuestionType[];
  totalQuestions: number;
}

export const StudyResultModal: React.FC<StudyResultModalProps> = ({
  visible,
  onCancel,
  onOk,
  onRetry,
  subject,
  completedQuestions,
  totalQuestions
}) => {
  const handleOk = () => {
    debugLog('Study result modal completed');
    onOk();
  };

  const handleRetry = () => {
    debugLog('Study retry requested');
    onRetry();
  };

  const calculateAverageScore = () => {
    if (completedQuestions.length === 0) return 0;
    const totalScore = completedQuestions.reduce((sum, question) => sum + question.score, 0);
    return totalScore / completedQuestions.length;
  };

  const calculateGrade = (averageScore: number) => {
    const percentage = averageScore * 100;
    if (percentage >= 95) return { letter: 'S', color: '#722ed1', description: 'Outstanding!' };
    if (percentage >= 85) return { letter: 'A', color: '#52c41a', description: 'Excellent!' };
    if (percentage >= 75) return { letter: 'B', color: '#1890ff', description: 'Good!' };
    if (percentage >= 65) return { letter: 'C', color: '#faad14', description: 'Satisfactory' };
    if (percentage >= 55) return { letter: 'D', color: '#fa8c16', description: 'Needs Improvement' };
    return { letter: 'F', color: '#ff4d4f', description: 'Keep Studying!' };
  };

  const averageScore = calculateAverageScore();
  const grade = calculateGrade(averageScore);
  const percentageCompleted = Math.round((completedQuestions.length / totalQuestions) * 100);
  const averagePercentage = Math.round(averageScore * 100);

  return (
    <Modal
      title={`${subject} - Study Results`}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="retry" onClick={handleRetry} size="large">
          Retry Study Session
        </Button>,
        <Button key="ok" type="primary" onClick={handleOk} size="large">
          OK
        </Button>
      ]}
      width={600}
      destroyOnHidden
      centered
    >
      <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
        {/* Grade Display */}
        <Card style={{ backgroundColor: '#fafafa', border: '2px solid #d9d9d9' }}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div 
              style={{ 
                fontSize: '120px', 
                fontWeight: 'bold', 
                color: grade.color,
                lineHeight: 1,
                marginBottom: '10px',
                textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {grade.letter}
            </div>
            <Title level={3} style={{ color: grade.color, margin: 0 }}>
              {grade.description}
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Average Score: {averagePercentage}%
            </Text>
          </div>
        </Card>

        {/* Statistics */}
        <Row gutter={16}>
          <Col span={12}>
            <Card>
              <Statistic
                title="Questions Completed"
                value={completedQuestions.length}
                suffix={`/ ${totalQuestions}`}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <Statistic
                title="Completion Rate"
                value={percentageCompleted}
                suffix="%"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Card>
              <Statistic
                title="Average Score"
                value={averagePercentage}
                suffix="%"
                valueStyle={{ color: grade.color }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <Statistic
                title="Grade"
                value={grade.letter}
                valueStyle={{ 
                  color: grade.color, 
                  fontSize: '24px',
                  fontWeight: 'bold'
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Summary Message */}
        <Card style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
          <Text style={{ fontSize: '16px', color: '#389e0d' }}>
            {percentageCompleted === 100 
              ? `🎉 Congratulations! You completed all ${totalQuestions} questions with an average score of ${averagePercentage}%.`
              : `You completed ${completedQuestions.length} out of ${totalQuestions} questions with an average score of ${averagePercentage}%.`
            }
          </Text>
        </Card>
      </Space>
    </Modal>
  );
};
