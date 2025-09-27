import React, { useState } from 'react';
import { Button, Card, Space, Typography, Alert, Divider, Progress } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { debugLog, debugError, debugInfo } from '../utils/logger';
import { getCacheStats, clearCaches, clearParserCache } from '../utils/langchain';
import { 
  genericPrompt, genericPromptStream, genericPromptsBatch,
  detailedPrompt, detailedPromptStream, detailedPromptsBatch,
  gradeSubmission, gradeSubmissionStream, gradeSubmissionsBatch,
  revisedStudyPlanPrompt, revisedStudyPlanPromptStream, revisedStudyPlanPromptsBatch
} from '../prompts';
import type { StudyModalStateType } from '../types';

const { Title, Text, Paragraph } = Typography;

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  result?: any;
}

export const PromptTester: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const testInput = "JavaScript fundamentals: variables, functions, and arrays";
  const testSubmission = {
    context: ["JavaScript basics", "Programming fundamentals"],
    question: "What is a variable in JavaScript?",
    answer: "A variable is a container that stores data values."
  };
  const testStudyModalState: StudyModalStateType = {
    context: "JavaScript fundamentals",
    completedQuestions: [
      {
        question: "What is a variable?",
        answer: "A container for data",
        score: 0.8,
        feedback: "Good understanding"
      },
      {
        question: "What is a function?",
        answer: "A block of code that performs a task",
        score: 0.6,
        feedback: "Needs more detail"
      }
    ],
    remainingQuestions: ["What are arrays?", "How do you declare variables?"]
  };

  const runSingleTest = async (testName: string, testFunction: () => Promise<any>): Promise<TestResult> => {
    debugLog(`Starting test: ${testName}`);
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      debugLog(`Test ${testName} completed successfully`, { duration, result });
      
      return {
        name: testName,
        success: true,
        duration,
        result: typeof result === 'object' ? JSON.stringify(result, null, 2) : result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      debugError(`Test ${testName} failed`, { duration, error: errorMessage });
      
      return {
        name: testName,
        success: false,
        duration,
        error: errorMessage
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setProgress(0);

    const tests = [
      // Standard prompts
      {
        name: 'Generic Prompt',
        fn: () => genericPrompt(testInput)
      },
      {
        name: 'Detailed Prompt', 
        fn: () => detailedPrompt(testInput)
      },
      {
        name: 'Grade Submission',
        fn: () => gradeSubmission(testSubmission)
      },
      {
        name: 'Revised Study Plan Prompt',
        fn: () => revisedStudyPlanPrompt(testStudyModalState)
      },
      
      // Streaming versions
      {
        name: 'Generic Prompt Stream',
        fn: () => genericPromptStream(testInput, (token) => {
          debugLog('Generic streaming token received:', token);
        })
      },
      {
        name: 'Detailed Prompt Stream',
        fn: () => detailedPromptStream(testInput, (token) => {
          debugLog('Detailed streaming token received:', token);
        })
      },
      {
        name: 'Grade Submission Stream',
        fn: () => gradeSubmissionStream(testSubmission, (token) => {
          debugLog('Grade streaming token received:', token);
        })
      },
      {
        name: 'Revised Study Plan Stream',
        fn: () => revisedStudyPlanPromptStream(testStudyModalState, (token) => {
          debugLog('Revised plan streaming token received:', token);
        })
      },
      
      // Batch versions
      {
        name: 'Generic Prompts Batch',
        fn: () => genericPromptsBatch([testInput, testInput])
      },
      {
        name: 'Detailed Prompts Batch',
        fn: () => detailedPromptsBatch([testInput, testInput])
      },
      {
        name: 'Grade Submissions Batch',
        fn: () => gradeSubmissionsBatch([testSubmission, testSubmission])
      },
      {
        name: 'Revised Study Plans Batch',
        fn: () => revisedStudyPlanPromptsBatch([testStudyModalState, testStudyModalState])
      }
    ];

    const results: TestResult[] = [];
    
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      setProgress(Math.round(((i + 1) / tests.length) * 100));
      
      const result = await runSingleTest(test.name, test.fn);
      results.push(result);
      
      setTestResults([...results]);
      
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsRunning(false);
    setProgress(100);
    
    // Log final results
    const successCount = results.filter(r => r.success).length;
    debugInfo('Test suite completed', { 
      total: results.length, 
      successful: successCount,
      failed: results.length - successCount
    });
  };

  const getCacheStatsInfo = () => {
    const stats = getCacheStats();
    return {
      modelPoolSize: stats.modelPoolSize,
      promptTemplateCacheSize: stats.promptTemplateCacheSize,
      parserCacheSize: stats.parserCacheSize,
      modelPoolEntries: stats.modelPoolEntries
    };
  };

  const handleClearCaches = () => {
    clearCaches();
    debugInfo('All caches cleared manually');
    // Refresh the display
    setTestResults([...testResults]);
  };

  const handleClearParserCache = () => {
    clearParserCache();
    debugInfo('Parser cache cleared manually');
    // Refresh the display
    setTestResults([...testResults]);
  };

  const successCount = testResults.filter(r => r.success).length;
  const totalCount = testResults.length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>🧪 Prompt Testing Suite</Title>
      <Paragraph>
        This component tests all prompts with the new optimizations including connection pooling, 
        caching, streaming, and batch processing.
      </Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={4}>Test Controls</Title>
              <Space>
                <Button 
                  type="primary" 
                  icon={<PlayCircleOutlined />}
                  onClick={runAllTests}
                  loading={isRunning}
                  disabled={isRunning}
                >
                  Run All Tests
                </Button>
                <Button 
                  onClick={handleClearCaches}
                  disabled={isRunning}
                >
                  Clear All Caches
                </Button>
                <Button 
                  onClick={handleClearParserCache}
                  disabled={isRunning}
                >
                  Clear Parser Cache
                </Button>
              </Space>
            </div>

            {isRunning && (
              <div>
                <Text>Running tests...</Text>
                <Progress percent={progress} status="active" />
              </div>
            )}

            {totalCount > 0 && (
              <Alert
                message={`Test Results: ${successCount}/${totalCount} passed (${successRate}% success rate)`}
                type={successRate === 100 ? 'success' : successRate > 50 ? 'warning' : 'error'}
                showIcon
              />
            )}
          </Space>
        </Card>

        <Card title="Cache Statistics">
          <Space direction="vertical" style={{ width: '100%' }}>
            {(() => {
              const stats = getCacheStatsInfo();
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                      <Text strong>Model Pool Size:</Text>
                      <br />
                      <Text>{stats.modelPoolSize}</Text>
                    </div>
                    <div>
                      <Text strong>Prompt Template Cache:</Text>
                      <br />
                      <Text>{stats.promptTemplateCacheSize}</Text>
                    </div>
                    <div>
                      <Text strong>Parser Cache:</Text>
                      <br />
                      <Text>{stats.parserCacheSize}</Text>
                    </div>
                  </div>

                  {stats.modelPoolEntries.length > 0 && (
                    <>
                      <Divider />
                      <Title level={5}>Model Pool Entries</Title>
                      {stats.modelPoolEntries.map((entry, index) => (
                        <div key={index} style={{ 
                          padding: '8px', 
                          backgroundColor: '#f5f5f5', 
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}>
                          <Text strong>{entry.key}</Text>
                          <br />
                          <Text type="secondary">
                            Uses: {entry.usageCount} | 
                            Last used: {Math.round((Date.now() - entry.lastUsed) / 1000)}s ago
                          </Text>
                        </div>
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </Space>
        </Card>

        {testResults.length > 0 && (
          <Card title="Test Results">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {testResults.map((result, index) => (
                <Card 
                  key={index}
                  size="small"
                  style={{ 
                    backgroundColor: result.success ? '#f6ffed' : '#fff2f0',
                    border: result.success ? '1px solid #b7eb8f' : '1px solid #ffccc7'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      {result.success ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      )}
                      <Text strong>{result.name}</Text>
                    </Space>
                    <Text type="secondary">{result.duration}ms</Text>
                  </div>

                  {result.error && (
                    <div style={{ marginTop: '8px' }}>
                      <Text type="danger">{result.error}</Text>
                    </div>
                  )}

                  {result.result && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer' }}>
                        <Text type="secondary">View Result</Text>
                      </summary>
                      <pre style={{ 
                        marginTop: '8px', 
                        padding: '8px', 
                        backgroundColor: '#f5f5f5', 
                        borderRadius: '4px',
                        fontSize: '12px',
                        overflow: 'auto',
                        maxHeight: '200px'
                      }}>
                        {result.result}
                      </pre>
                    </details>
                  )}
                </Card>
              ))}
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
};
