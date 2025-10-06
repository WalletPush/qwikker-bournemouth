'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TestResult {
  id: string
  query: string
  response: string
  responseTime: number
  accuracy: 'excellent' | 'good' | 'poor' | 'failed'
  businessContext?: string
  timestamp: Date
}

const testQueries = [
  {
    id: 'general-1',
    query: "What are the best restaurants in Bournemouth?",
    expectedContext: "Should return local Bournemouth businesses only",
    category: 'General Discovery'
  },
  {
    id: 'business-specific-1', 
    query: "Tell me about Jerry's Burgers menu",
    expectedContext: "Should only return Jerry's Burgers information",
    category: 'Business Specific'
  },
  {
    id: 'offers-1',
    query: "What offers are available this week?",
    expectedContext: "Should return current live offers",
    category: 'Offers'
  },
  {
    id: 'secret-menu-1',
    query: "Show me secret menu items",
    expectedContext: "Should return secret menu items from approved businesses",
    category: 'Secret Menu'
  },
  {
    id: 'location-1',
    query: "Where can I get coffee near the beach?",
    expectedContext: "Should filter by location and business type",
    category: 'Location-based'
  },
  {
    id: 'edge-case-1',
    query: "What's the weather like today?",
    expectedContext: "Should decline to answer non-business queries",
    category: 'Edge Cases'
  }
]

export function AITestPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [results, setResults] = useState<TestResult[]>([])
  const [selectedCity, setSelectedCity] = useState('bournemouth')
  const [customQuery, setCustomQuery] = useState('')

  const clearResults = () => {
    setResults([])
  }

  const runSingleTest = async (testQuery: typeof testQueries[0]) => {
    setCurrentTest(testQuery.id)
    const startTime = Date.now()
    
    try {
      // TODO: Replace with actual AI chat API call
      const mockResponse = await simulateAIResponse(testQuery.query, selectedCity)
      const responseTime = Date.now() - startTime
      
      const result: TestResult = {
        id: testQuery.id,
        query: testQuery.query,
        response: mockResponse.response,
        responseTime,
        accuracy: mockResponse.accuracy,
        businessContext: mockResponse.businessContext,
        timestamp: new Date()
      }
      
      setResults(prev => [result, ...prev])
    } catch (error) {
      const result: TestResult = {
        id: testQuery.id,
        query: testQuery.query,
        response: `Error: ${error}`,
        responseTime: Date.now() - startTime,
        accuracy: 'failed',
        timestamp: new Date()
      }
      
      setResults(prev => [result, ...prev])
    }
    
    setCurrentTest(null)
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setResults([])
    
    for (const testQuery of testQueries) {
      await runSingleTest(testQuery)
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    setIsRunning(false)
  }

  const runCustomTest = async () => {
    if (!customQuery.trim()) return
    
    const customTestQuery = {
      id: `custom-${Date.now()}`,
      query: customQuery,
      expectedContext: "Custom user query",
      category: 'Custom Test'
    }
    
    await runSingleTest(customTestQuery)
    setCustomQuery('')
  }

  const getAccuracyColor = (accuracy: TestResult['accuracy']) => {
    switch (accuracy) {
      case 'excellent': return 'bg-green-500'
      case 'good': return 'bg-blue-500'
      case 'poor': return 'bg-orange-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getAccuracyText = (accuracy: TestResult['accuracy']) => {
    switch (accuracy) {
      case 'excellent': return 'Excellent'
      case 'good': return 'Good'
      case 'poor': return 'Poor'
      case 'failed': return 'Failed'
      default: return 'Unknown'
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">AI Chat Testing Suite</h1>
          <p className="text-slate-400">Test AI responses for accuracy, context awareness, and business filtering</p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Test Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  City Context
                </label>
                <select 
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="bournemouth">Bournemouth</option>
                  <option value="london">London</option>
                  <option value="paris">Paris</option>
                </select>
              </div>
              
              <Button 
                onClick={runAllTests}
                disabled={isRunning}
                className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold"
              >
                {isRunning ? 'Running Tests...' : 'Run All Tests'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Custom Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Enter your custom test query..."
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 resize-none"
                rows={3}
              />
              <Button 
                onClick={runCustomTest}
                disabled={!customQuery.trim() || currentTest !== null}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Test Custom Query
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Test Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Tests:</span>
                  <span className="text-white font-semibold">{results.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Excellent:</span>
                  <span className="text-green-400 font-semibold">
                    {results.filter(r => r.accuracy === 'excellent').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Good:</span>
                  <span className="text-blue-400 font-semibold">
                    {results.filter(r => r.accuracy === 'good').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Failed:</span>
                  <span className="text-red-400 font-semibold">
                    {results.filter(r => r.accuracy === 'failed').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Avg Response:</span>
                  <span className="text-white font-semibold">
                    {results.length > 0 ? 
                      Math.round(results.reduce((acc, r) => acc + r.responseTime, 0) / results.length) 
                      : 0}ms
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Predefined Test Queries */}
        <Card className="bg-slate-900 border-slate-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Predefined Test Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testQueries.map((testQuery) => (
                <div 
                  key={testQuery.id}
                  className="p-4 bg-slate-800 border border-slate-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {testQuery.category}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => runSingleTest(testQuery)}
                      disabled={currentTest === testQuery.id || isRunning}
                      className="bg-slate-700 hover:bg-slate-600 text-white"
                    >
                      {currentTest === testQuery.id ? 'Testing...' : 'Test'}
                    </Button>
                  </div>
                  <p className="text-sm text-white mb-2">"{testQuery.query}"</p>
                  <p className="text-xs text-slate-400">{testQuery.expectedContext}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Test Results</CardTitle>
              {results.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearResults}
                  className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                >
                  Clear Results
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No test results yet. Run some tests to see results here.</p>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <div 
                    key={`${result.id}-${result.timestamp.getTime()}`}
                    className="p-4 bg-slate-800 border border-slate-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`${getAccuracyColor(result.accuracy)} text-white`}>
                          {getAccuracyText(result.accuracy)}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {result.responseTime}ms
                        </span>
                        <span className="text-xs text-slate-400">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-slate-300 mb-1">Query:</p>
                      <p className="text-sm text-white bg-slate-700/50 p-2 rounded">
                        "{result.query}"
                      </p>
                    </div>
                    
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-slate-300 mb-1">Response:</p>
                      <p className="text-sm text-slate-100 bg-slate-700/50 p-2 rounded max-h-32 overflow-y-auto">
                        {result.response}
                      </p>
                    </div>
                    
                    {result.businessContext && (
                      <div>
                        <p className="text-sm font-semibold text-slate-300 mb-1">Business Context:</p>
                        <p className="text-xs text-slate-400 bg-slate-700/50 p-2 rounded">
                          {result.businessContext}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// TODO: Replace this with actual AI API integration
async function simulateAIResponse(query: string, city: string) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200))
  
  // Mock responses based on query type
  if (query.toLowerCase().includes('weather')) {
    return {
      response: "The weather in Bournemouth today looks lovely! Perfect for exploring the local businesses and attractions. If you're planning to head out, I can recommend some great spots to visit - from seaside cafés to indoor entertainment if it gets chilly later!",
      accuracy: 'excellent' as const,
      businessContext: 'Helpful general information with business suggestions'
    }
  }
  
  if (query.toLowerCase().includes("jerry's") || query.toLowerCase().includes('burger')) {
    return {
      response: "Jerry's Burgers is a popular local spot in Bournemouth! They offer classic American-style burgers with fresh ingredients. Their menu includes the signature Jerry Burger, BBQ Bacon Burger, and vegetarian options. They're open Monday-Sunday 11am-10pm. Would you like to see their current offers or get directions?",
      accuracy: 'excellent' as const,
      businessContext: 'Jerry\'s Burgers - Bournemouth'
    }
  }
  
  if (query.toLowerCase().includes('restaurant') || query.toLowerCase().includes('food')) {
    return {
      response: `Here are some excellent restaurants in ${city.charAt(0).toUpperCase() + city.slice(1)}: Jerry's Burgers for American classics, The Local Bistro for fine dining, and Seaside Fish & Chips for traditional British fare. Each offers unique experiences and current promotions. Which type of cuisine interests you most?`,
      accuracy: 'good' as const,
      businessContext: `${city} restaurants - multiple businesses`
    }
  }
  
  if (query.toLowerCase().includes('offer') || query.toLowerCase().includes('deal')) {
    return {
      response: "Current offers this week include: 2-for-1 burgers at Jerry's (valid until Sunday), 20% off dinner at The Local Bistro (weekdays only), and a free drink with any meal at Seaside Café. Would you like me to add any of these to your wallet?",
      accuracy: 'good' as const,
      businessContext: 'Multiple current offers'
    }
  }
  
  if (query.toLowerCase().includes('secret menu')) {
    return {
      response: "I can show you secret menu items from our partner businesses! Jerry's has a hidden 'Monster Burger' not on the regular menu, and The Local Bistro offers an exclusive tasting menu for VIP members. To access these, you'll need to mention you're a Qwikker member. Which secret menu interests you?",
      accuracy: 'excellent' as const,
      businessContext: 'Secret menu items from approved businesses'
    }
  }
  
  if (query.toLowerCase().includes('coffee') && query.toLowerCase().includes('beach')) {
    return {
      response: "For coffee near the beach in Bournemouth, I recommend Seaside Café (2-minute walk from the pier) and Beach Beans Coffee House (right on the promenade). Both offer excellent coffee with sea views. Seaside Café currently has a 'Buy 2 Get 1 Free' offer on all hot drinks!",
      accuracy: 'excellent' as const,
      businessContext: 'Location-filtered coffee shops near beach'
    }
  }
  
  // Default response
  return {
    response: `I'd be happy to help you discover businesses in ${city}! I can provide information about restaurants, cafés, offers, secret menus, and local recommendations. What specifically are you looking for?`,
    accuracy: 'good' as const,
    businessContext: `General ${city} business discovery`
  }
}
