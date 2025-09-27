import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Space, Typography, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { AppStateType } from '../types';
import { debugLog } from '../utils/logger';

const { TextArea } = Input;
const { Text } = Typography;

interface EditModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (updatedState: AppStateType) => void;
  initialData: AppStateType;
}

export const EditModal: React.FC<EditModalProps> = ({
  visible,
  onCancel,
  onOk,
  initialData
}) => {
  const [form] = Form.useForm();
  const [localData, setLocalData] = useState<AppStateType>(initialData);

  // Update local data when modal opens or initial data changes
  useEffect(() => {
    if (visible) {
      setLocalData(initialData);
      form.setFieldsValue(initialData);
      debugLog('EditModal opened with data:', initialData);
    }
  }, [visible, initialData, form]);

  const handleAddArrayItem = (fieldName: 'subTopics' | 'context' | 'questions') => {
    const newItem = '';
    const updatedArray = [...localData[fieldName], newItem];
    const updatedData = { ...localData, [fieldName]: updatedArray };
    setLocalData(updatedData);
    form.setFieldsValue(updatedData);
    debugLog(`Added new item to ${fieldName}:`, updatedArray);
  };

  const handleDeleteArrayItem = (fieldName: 'subTopics' | 'context' | 'questions', index: number) => {
    const updatedArray = localData[fieldName].filter((_, i) => i !== index);
    const updatedData = { ...localData, [fieldName]: updatedArray };
    setLocalData(updatedData);
    form.setFieldsValue(updatedData);
    debugLog(`Deleted item from ${fieldName} at index ${index}:`, updatedArray);
  };

  const handleArrayItemChange = (fieldName: 'subTopics' | 'context' | 'questions', index: number, value: string) => {
    const updatedArray = localData[fieldName].map((item, i) => i === index ? value : item);
    const updatedData = { ...localData, [fieldName]: updatedArray };
    setLocalData(updatedData);
    debugLog(`Updated ${fieldName}[${index}]:`, value);
  };

  const handleFieldChange = (fieldName: keyof AppStateType, value: string) => {
    const updatedData = { ...localData, [fieldName]: value };
    setLocalData(updatedData);
    debugLog(`Updated ${fieldName}:`, value);
  };

  const handleOk = () => {
    form.validateFields().then(() => {
      debugLog('EditModal saving data:', localData);
      onOk(localData);
    }).catch((error) => {
      debugLog('Form validation failed:', error);
    });
  };

  const handleCancel = () => {
    // Reset to initial data when canceling
    setLocalData(initialData);
    form.setFieldsValue(initialData);
    onCancel();
  };

  const renderArrayField = (fieldName: 'subTopics' | 'context' | 'questions', label: string) => {
    return (
      <Form.Item label={label} key={fieldName}>
        {localData[fieldName].map((item, index) => (
          <div key={index} style={{ marginBottom: '8px' }}>
            <Space.Compact style={{ width: '100%' }}>
              <TextArea
                value={item}
                onChange={(e) => handleArrayItemChange(fieldName, index, e.target.value)}
                placeholder={`Enter ${label.toLowerCase().slice(0, -1)}...`}
                rows={2}
                style={{ flex: 1 }}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteArrayItem(fieldName, index)}
                style={{ flexShrink: 0 }}
              />
            </Space.Compact>
          </div>
        ))}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => handleAddArrayItem(fieldName)}
          style={{ width: '100%' }}
        >
          Add {label.slice(0, -1)}
        </Button>
      </Form.Item>
    );
  };

  return (
    <Modal
      title="Edit Study Plan"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={800}
      okText="Save Changes"
      cancelText="Cancel"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={localData}
      >
        <Form.Item label="Subject">
          <Input
            value={localData.subject}
            onChange={(e) => handleFieldChange('subject', e.target.value)}
            placeholder="Enter subject..."
          />
        </Form.Item>

        <Divider />

        {renderArrayField('subTopics', 'Sub Topics')}
        
        <Divider />
        
        {renderArrayField('context', 'Context Items')}
        
        <Divider />
        
        {renderArrayField('questions', 'Questions')}
      </Form>
    </Modal>
  );
};
