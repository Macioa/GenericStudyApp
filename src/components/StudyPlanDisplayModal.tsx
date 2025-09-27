import React from 'react';
import { Modal, Button, Input } from 'antd';
import type { AppStateType } from '../types';
import { debugLog } from '../utils/logger';

const { TextArea } = Input;

interface StudyPlanDisplayModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: () => void;
  studyPlanData: AppStateType;
}

export const StudyPlanDisplayModal: React.FC<StudyPlanDisplayModalProps> = ({
  visible,
  onCancel,
  onOk,
  studyPlanData
}) => {
  const handleOk = () => {
    debugLog('Study plan display modal completed');
    onOk();
  };

  const handleSaveToFile = () => {
    try {
      const jsonData = JSON.stringify(studyPlanData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create filename from subject, sanitizing it for filesystem
      const sanitizedSubject = studyPlanData.subject
        .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .toLowerCase();
      
      const filename = `${sanitizedSubject}_StudyPlan.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      debugLog('Study plan saved to file:', filename);
    } catch (error) {
      debugLog('Failed to save study plan to file:', error);
    }
  };

  const formatStudyPlanData = (data: AppStateType): string => {
    let formatted = `Study Plan: ${data.subject}\n\n`;
    
    if (data.subTopics.length > 0) {
      formatted += `Sub Topics:\n`;
      data.subTopics.forEach((topic, index) => {
        if (topic.trim()) {
          formatted += `${index + 1}. ${topic}\n`;
        }
      });
      formatted += '\n';
    }
    
    if (data.context.length > 0) {
      formatted += `Context:\n`;
      data.context.forEach((item, index) => {
        if (item.trim()) {
          formatted += `${index + 1}. ${item}\n`;
        }
      });
      formatted += '\n';
    }
    
    if (data.questions.length > 0) {
      formatted += `Questions:\n`;
      data.questions.forEach((question, index) => {
        if (question.trim()) {
          formatted += `${index + 1}. ${question}\n`;
        }
      });
    }
    
    return formatted;
  };

  return (
    <Modal
      title={`Study Plan: ${studyPlanData.subject}`}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="save" onClick={handleSaveToFile}>
          Save to File
        </Button>,
        <Button key="ok" type="primary" onClick={handleOk}>
          OK
        </Button>,
      ]}
      width={800}
      destroyOnHidden
      centered
    >
      <TextArea
        value={formatStudyPlanData(studyPlanData)}
        readOnly
        rows={20}
        style={{ 
          fontFamily: 'monospace',
          fontSize: '14px',
          backgroundColor: '#fafafa',
          border: '1px solid #d9d9d9'
        }}
        placeholder="No study plan data available"
      />
    </Modal>
  );
};
