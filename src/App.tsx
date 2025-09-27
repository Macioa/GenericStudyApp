import { useState } from 'react'
import { Button, Card, Input, Form, Typography, Space, Tabs, Spin } from 'antd'
import { z } from 'zod'
import type { AppStateType } from './types'
import { detailedPrompt, genericPrompt } from './prompts'
import './App.css'

const { Text } = Typography

// Zod schema for validation
const studyTopicSchema = z.object({
  topic: z.string().min(1, 'Prompt is required').max(4000, 'Prompt must be less than 4000 characters'),
})

function App() {
  const [studyTopic, setStudyTopic] = useState('')
  const [isValid, setIsValid] = useState(false)
  const [activeTab, setActiveTab] = useState('1')
  const [isLoading, setIsLoading] = useState(false)
  const [_appState, setAppState] = useState<AppStateType>({
    subject: '',
    originalPrompt: '',
    subTopics: [],
    context: [],
    questions: []
  })

  const handleTopicChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setStudyTopic(value)
    
    try {
      studyTopicSchema.parse({ topic: value })
      setIsValid(true)
    } catch {
      setIsValid(false)
    }
  }

  const handleStartStudying = async () => {
    if (isValid) {
      setIsLoading(true)
      try {
        // Use detailedPrompt for tab 1 (with specific details), genericPrompt for tab 2 (without specific details)
        const result = activeTab === '1' 
          ? await detailedPrompt(studyTopic)
          : await genericPrompt(studyTopic)
        setAppState(result)
      } catch (error) {
        console.error('Failed to generate study plan:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const tabItems = [
    {
      key: '1',
      label: 'With specific topic details',
      children: (
        <Form layout="vertical">
          <Form.Item label="What would you like to study today?">
            <Input.TextArea
              placeholder="Enter detailed topic information, specific concepts, examples, broken down by subtopic, or including specific questions..."
              value={studyTopic}
              onChange={handleTopicChange}
              status={studyTopic && !isValid ? 'error' : ''}
              rows={20}
              style={{ fontSize: '16px', lineHeight: '1.6' }}
            />
            {studyTopic && !isValid && (
              <Text type="danger" style={{ fontSize: '12px' }}>
                Topic must be between 1 and 100 characters
              </Text>
            )}
          </Form.Item>
          
          <Space>
            <Button 
              type="primary" 
              disabled={!isValid}
              onClick={handleStartStudying}
            >
              Start Studying
            </Button>
            <Button onClick={() => setStudyTopic('')}>
              Clear
            </Button>
          </Space>
        </Form>
      )
    },
    {
      key: '2',
      label: 'Without specific topic details',
      children: (
        <Form layout="vertical">
          <Form.Item label="What would you like to study today?">
            <Input.TextArea
              placeholder="Enter a general topic or subject area..."
              value={studyTopic}
              onChange={handleTopicChange}
              status={studyTopic && !isValid ? 'error' : ''}
              rows={20}
              style={{ fontSize: '16px', lineHeight: '1.6' }}
            />
            {studyTopic && !isValid && (
              <Text type="danger" style={{ fontSize: '12px' }}>
                Topic must be between 1 and 100 characters
              </Text>
            )}
          </Form.Item>
          
          <Space>
            <Button 
              type="primary" 
              disabled={!isValid}
              onClick={handleStartStudying}
            >
              Start Studying
            </Button>
            <Button onClick={() => setStudyTopic('')}>
              Clear
            </Button>
          </Space>
        </Form>
      )
    }
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <h1 style={{ textAlign: 'center', marginBottom: '24px', color: '#213547', fontWeight: 'bold', fontSize: '32px' }}>
          Generic Study App
        </h1>
        <Spin spinning={isLoading}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={tabItems}
          />
        </Spin>
      </Card>
    </div>
  )
}

export default App
