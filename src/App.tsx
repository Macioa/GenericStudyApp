import { useState } from 'react'
import { Button, Card, Input, Form, Typography, Space } from 'antd'
import { z } from 'zod'
import './App.css'

const { Title, Text } = Typography

// Zod schema for validation
const studyTopicSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(100, 'Topic must be less than 100 characters'),
})

function App() {
  const [studyTopic, setStudyTopic] = useState('')
  const [isValid, setIsValid] = useState(false)

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setStudyTopic(value)
    
    try {
      studyTopicSchema.parse({ topic: value })
      setIsValid(true)
    } catch {
      setIsValid(false)
    }
  }

  const handleStartStudying = () => {
    if (isValid) {
      alert(`Ready to study: ${studyTopic}`)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <Title level={1}>GenericStudyApp</Title>
      <Text>A React TypeScript study application with AI integration.</Text>
      
      <Card style={{ marginTop: '24px' }}>
        <Form layout="vertical">
          <Form.Item label="What would you like to study today?">
            <Input
              placeholder="Enter a topic (e.g., React hooks, TypeScript basics)"
              value={studyTopic}
              onChange={handleTopicChange}
              status={studyTopic && !isValid ? 'error' : ''}
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
      </Card>

      <Card style={{ marginTop: '16px' }}>
        <Text type="secondary">
          Dependencies included: React, TypeScript, Vite, Ant Design, Zod, LangChain, and dotenv
        </Text>
      </Card>
    </div>
  )
}

export default App
