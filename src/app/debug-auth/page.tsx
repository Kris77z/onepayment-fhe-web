'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugAuthPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  function getErrorMessage(err: unknown): string {
    if (typeof err === 'object' && err !== null) {
      const e = err as { message?: string };
      return e?.message || 'Unexpected error';
    }
    return String(err || 'Unexpected error');
  }

  const testBackendConnection = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addLog('🔍 检查环境变量...');
      addLog(`API_BASE: ${process.env.NEXT_PUBLIC_API_BASE}`);
      addLog(`API_KEY: ${process.env.NEXT_PUBLIC_API_KEY?.substring(0, 8)}...`);
      
      addLog('🚀 测试基础连接...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/healthz`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.text();
        addLog(`✅ 健康检查成功: ${data}`);
      } else {
        addLog(`❌ 健康检查失败: ${response.status} ${response.statusText}`);
      }
      
      addLog('🔐 测试注册接口...');
      const testEmail = `test-${Date.now()}@example.com`;
      const registerResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'testpass123'
        })
      });
      
      if (registerResponse.ok) {
        const registerData = await registerResponse.json();
        addLog(`✅ 注册成功: ${JSON.stringify(registerData, null, 2)}`);
      } else {
        const errorData = await registerResponse.text();
        addLog(`❌ 注册失败: ${registerResponse.status} ${registerResponse.statusText}`);
        addLog(`错误详情: ${errorData}`);
      }
      
    } catch (error: unknown) {
      addLog(`💥 连接错误: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const testWithApiKey = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addLog('🔑 使用API密钥测试商户信息...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/merchant/self?api_key=${process.env.NEXT_PUBLIC_API_KEY}`, {
        method: 'GET',
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        addLog(`✅ 商户信息获取成功: ${JSON.stringify(data, null, 2)}`);
      } else {
        const errorData = await response.text();
        addLog(`❌ 商户信息获取失败: ${response.status} ${response.statusText}`);
        addLog(`错误详情: ${errorData}`);
      }
      
    } catch (error: unknown) {
      addLog(`💥 API请求错误: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>后端连接调试</CardTitle>
            <CardDescription>
              测试前端与后端的连接状态和API功能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={testBackendConnection} 
                disabled={loading}
                className="flex-1"
              >
                {loading ? '测试中...' : '测试注册接口'}
              </Button>
              <Button 
                onClick={testWithApiKey} 
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                {loading ? '测试中...' : '测试API密钥'}
              </Button>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">环境变量状态:</h3>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                <p>NEXT_PUBLIC_API_BASE: {process.env.NEXT_PUBLIC_API_BASE || '❌ 未设置'}</p>
                <p>NEXT_PUBLIC_API_KEY: {process.env.NEXT_PUBLIC_API_KEY ? `${process.env.NEXT_PUBLIC_API_KEY.substring(0, 8)}...` : '❌ 未设置'}</p>
              </div>
            </div>
            
            {testResults.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">测试结果:</h3>
                <div className="bg-black text-green-400 p-4 rounded text-sm font-mono max-h-96 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div key={index}>{result}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
