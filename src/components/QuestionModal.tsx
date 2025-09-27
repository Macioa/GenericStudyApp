import React, { useState } from 'react';
import { Modal, Typography, Input, Button, Space } from 'antd';
import { debugLog } from '../utils/logger';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface QuestionModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (answer: string) => void;
  subject: string;
  question: string;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  visible,
  onCancel,
  onOk,
  subject,
  question
}) => {
  const [answer, setAnswer] = useState<string>('');

  const handleOk = () => {
    debugLog('QuestionModal submitted with answer:', answer);
    onOk(answer);
    setAnswer(''); // Reset answer after submission
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
      okText="Submit Answer"
      cancelText="Cancel"
      destroyOnClose
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          {question}
        </Text>
        
        <TextArea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter your answer here..."
          rows={8}
          style={{ fontSize: '14px' }}
        />
      </Space>
    </Modal>
  );
};
