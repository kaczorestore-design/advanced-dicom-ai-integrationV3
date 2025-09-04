import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';

interface TestResult {
  protocol: string;
  operation: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  duration?: number;
}

export const DICOMProtocolTester: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDICOMwebTests = async () => {
    const tests = [
      { protocol: 'DICOMweb', operation: 'QIDO-RS Study Search', endpoint: '/dicomweb/studies' },
      { protocol: 'DICOMweb', operation: 'WADO-RS Metadata', endpoint: '/dicomweb/studies/1.2.3.1/metadata' },
      { protocol: 'DICOMweb', operation: 'WADO-RS Instance', endpoint: '/dicomweb/studies/1.2.3.1/series/1.2.3.1.1/instances/1.2.3.1.1.1' },
      { protocol: 'DICOMweb', operation: 'STOW-RS Store', endpoint: '/dicomweb/studies', method: 'POST' }
    ];

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    for (const test of tests) {
      const startTime = Date.now();
      try {
        const response = await fetch(`http://localhost:8000${test.endpoint}`, {
          method: test.method || 'GET',
          headers,
          ...(test.method === 'POST' && {
            body: new FormData()
          })
        });

        const duration = Date.now() - startTime;
        const result: TestResult = {
          protocol: test.protocol,
          operation: test.operation,
          status: response.ok ? 'success' : 'error',
          message: response.ok ? `HTTP ${response.status}` : `HTTP ${response.status} - ${response.statusText}`,
          duration
        };

        setTestResults(prev => [...prev, result]);
      } catch (error) {
        const duration = Date.now() - startTime;
        const result: TestResult = {
          protocol: test.protocol,
          operation: test.operation,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration
        };

        setTestResults(prev => [...prev, result]);
      }
    }
  };

  const runDIMSETests = async () => {
    const tests = [
      { protocol: 'DIMSE', operation: 'C-ECHO', command: 'C-ECHO' },
      { protocol: 'DIMSE', operation: 'C-FIND Study', command: 'C-FIND' },
      { protocol: 'DIMSE', operation: 'C-MOVE', command: 'C-MOVE' },
      { protocol: 'DIMSE', operation: 'C-GET', command: 'C-GET' }
    ];

    try {
      const ws = new WebSocket('ws://localhost:8000/dimse/dimse');
      
      ws.onopen = () => {
        tests.forEach(async (test, index) => {
          setTimeout(() => {
            const startTime = Date.now();
            const command = {
              type: test.command,
              config: {
                host: 'localhost',
                port: 11112,
                callingAET: 'PACS_CLIENT',
                calledAET: 'PACS_SERVER'
              },
              ...(test.command === 'C-FIND' && {
                level: 'STUDY',
                criteria: { '0010,0020': 'PAT001' }
              }),
              ...(test.command === 'C-MOVE' && {
                destinationAET: 'PACS_CLIENT',
                criteria: { '0020,000D': '1.2.3.1' }
              }),
              ...(test.command === 'C-GET' && {
                criteria: { '0020,000D': '1.2.3.1' }
              })
            };

            ws.send(JSON.stringify(command));

            const messageHandler = (event: MessageEvent) => {
              const response = JSON.parse(event.data);
              const duration = Date.now() - startTime;
              
              const result: TestResult = {
                protocol: test.protocol,
                operation: test.operation,
                status: response.status === 'SUCCESS' ? 'success' : 'error',
                message: response.message || response.status,
                duration
              };

              setTestResults(prev => [...prev, result]);
              ws.removeEventListener('message', messageHandler);
            };

            ws.addEventListener('message', messageHandler);
          }, index * 1000);
        });
      };

      ws.onerror = () => {
        tests.forEach(test => {
          const result: TestResult = {
            protocol: test.protocol,
            operation: test.operation,
            status: 'error',
            message: 'WebSocket connection failed'
          };
          setTestResults(prev => [...prev, result]);
        });
      };
    } catch {
      tests.forEach(test => {
        const result: TestResult = {
          protocol: test.protocol,
          operation: test.operation,
          status: 'error',
          message: 'Failed to connect to DIMSE service'
        };
        setTestResults(prev => [...prev, result]);
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    await runDICOMwebTests();
    await runDIMSETests();
    
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'success' ? 'default' : status === 'error' ? 'destructive' : 'secondary';
    return (
      <Badge variant={variant} className="text-xs">
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="bg-gray-700 border-gray-600">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white flex items-center justify-between">
          DICOM Protocol Tester
          <Button
            variant="outline"
            size="sm"
            onClick={runAllTests}
            disabled={isRunning}
            className="text-xs"
          >
            <Play className="w-3 h-3 mr-1" />
            {isRunning ? 'Running...' : 'Run Tests'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {testResults.length === 0 && !isRunning && (
          <div className="text-xs text-gray-400 text-center py-4">
            Click "Run Tests" to test DICOM protocols
          </div>
        )}
        
        {testResults.map((result, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-600 rounded">
            <div className="flex items-center space-x-2">
              {getStatusIcon(result.status)}
              <div>
                <div className="text-xs font-medium text-white">
                  {result.protocol} - {result.operation}
                </div>
                <div className="text-xs text-gray-300">{result.message}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {result.duration && (
                <span className="text-xs text-gray-400">{result.duration}ms</span>
              )}
              {getStatusBadge(result.status)}
            </div>
          </div>
        ))}
        
        {testResults.length > 0 && (
          <div className="mt-4 p-2 bg-gray-600 rounded">
            <div className="text-xs text-gray-300">
              Summary: {testResults.filter(r => r.status === 'success').length} passed, {' '}
              {testResults.filter(r => r.status === 'error').length} failed
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
