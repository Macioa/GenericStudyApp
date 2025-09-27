import React, { useState } from 'react';
import { Modal, Typography, List, Progress, Card, Space } from 'antd';
import type { AppStateType } from '../types';
import type { StudyModalStateType } from '../types/studyModal';
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
  const [modalState] = useState<StudyModalStateType>({
    context: appState.context.join('\n'),
    remainingQuestions: [...appState.questions],
    completedQuestions: []
  });

  const handleCancel = () => {
    debugLog('StudyModal cancelled');
    onCancel();
  };

  const handleOk = () => {
    debugLog('StudyModal completed with state:', modalState);
    onCancel(); // Close modal for now
  };

  return (
    <Modal
      title="Study Session"
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
          <Text>{modalState.context}</Text>
        </Card>

        {/* Progress Section */}
        <Card title="Progress" size="small">
          <Progress
            percent={Math.round((modalState.completedQuestions.length / (modalState.completedQuestions.length + modalState.remainingQuestions.length)) * 100)}
            status="active"
          />
          <Text type="secondary">
            {modalState.completedQuestions.length} of {modalState.completedQuestions.length + modalState.remainingQuestions.length} questions completed
          </Text>
        </Card>

        {/* Remaining Questions */}
        <Card title="Remaining Questions" size="small">
          <List
            size="small"
            dataSource={modalState.remainingQuestions}
            renderItem={(question, index) => (
              <List.Item>
                <Text>{index + 1}. {question}</Text>
              </List.Item>
            )}
          />
        </Card>

        {/* Completed Questions */}
        {modalState.completedQuestions.length > 0 && (
          <Card title="Completed Questions" size="small">
            <List
              size="small"
              dataSource={modalState.completedQuestions}
              renderItem={(item, index) => (
                <List.Item>
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
    </Modal>
  );
};
