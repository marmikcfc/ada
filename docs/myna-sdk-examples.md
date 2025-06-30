# Myna SDK - Examples

Real-world examples and implementation patterns for integrating Myna SDK into various applications.

## Table of Contents

- [Quick Start Examples](#quick-start-examples)
- [E-commerce Integration](#e-commerce-integration)
- [SaaS Application Support](#saas-application-support)
- [Educational Platform](#educational-platform)
- [Healthcare Assistance](#healthcare-assistance)
- [Multi-language Support](#multi-language-support)
- [Advanced Patterns](#advanced-patterns)

---

## Quick Start Examples

### 1. Basic Floating Widget

Perfect for adding AI assistance to any existing website:

```tsx
import React from 'react';
import { Myna } from 'myna-sdk';

function BasicExample() {
  return (
    <div>
      <h1>My Website</h1>
      <p>Your existing content here...</p>
      
      {/* Myna floating widget */}
      <Myna
        webrtcURL="https://api.mycompany.com/api/offer"
        websocketURL="wss://api.mycompany.com/ws/messages"
      />
    </div>
  );
}

export default BasicExample;
```

### 2. Full-Screen Chat Page

Dedicated chat interface for conversational experiences:

```tsx
import React from 'react';
import { Myna } from 'myna-sdk';

function ChatPage() {
  return (
    <div style={{ height: '100vh' }}>
      <Myna
        webrtcURL="https://api.mycompany.com/api/offer"
        websocketURL="wss://api.mycompany.com/ws/messages"
        bubbleEnabled={false}
        options={{
          agentName: "AI Assistant",
          logoUrl: "/assistant-avatar.png",
        }}
      />
    </div>
  );
}

export default ChatPage;
```

### 3. Floating Widget with Fullscreen Mode

Embed a floating button that expands into a 3-column fullscreen modal:

```tsx
import React from 'react';
import { Myna } from 'myna-sdk';
import 'myna-sdk/dist/FullscreenLayout.css'; // Import fullscreen CSS

function FloatingFullscreenExample() {
  return (
    <div>
      {/* Your page content here */}
      <Myna
        webrtcURL="/api/offer"
        websocketURL="/ws/messages"
        bubbleEnabled={true}
        showThreadManager={true}
        allowFullScreen={true}
        options={{
          agentName: 'Ada',
          agentSubtitle: 'Your intelligent AI assistant',
          logoUrl: '/favicon.ico',
          backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          primaryColor: '#667eea',
          accentColor: '#5a67d8',
          threadManagerTitle: 'Chat History',
          enableThreadManager: true,
          startCallButtonText: '🎤 Start Voice Chat',
          endCallButtonText: '🔇 End Voice Chat',
          connectingText: 'Connecting to Ada...',
        }}
      />
    </div>
  );
}

export default FloatingFullscreenExample;
```

---

## E-commerce Integration

### Customer Support Widget

```tsx
import React from 'react';
import { Myna, createTheme } from 'myna-sdk';

const shopTheme = createTheme({
  colors: {
    primary: '#f59e0b', // Orange brand
    secondary: '#d97706',
    background: '#fefbf3',
  },
  borderRadius: {
    lg: '1rem',
  },
});

function EcommerceSupport() {
  return (
    <div>
      {/* Your e-commerce site content */}
      <header>
        <nav>Shop Navigation</nav>
      </header>
      
      <main>
        <div className="product-grid">
          {/* Product listings */}
        </div>
      </main>
      
      {/* Support widget */}
      <Myna
        webrtcURL="https://api.myshop.com/api/offer"
        websocketURL="wss://api.myshop.com/ws/support"
        options={{
          theme: shopTheme,
          agentName: "Shopping Assistant",
          logoUrl: "/shop-logo.svg",
          mcpEndpoints: [
            {
              name: "product-catalog",
              url: "https://api.myshop.com/mcp/products",
            },
            {
              name: "order-tracking",
              url: "https://api.myshop.com/mcp/orders",
            },
            {
              name: "inventory-check",
              url: "https://api.myshop.com/mcp/inventory",
            },
          ],
        }}
      />
    </div>
  );
}

export default EcommerceSupport;
```

### Product Recommendation Bot

```tsx
import React, { useState } from 'react';
import { useMynaClient } from 'myna-sdk';

function ProductRecommendationBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [userPreferences, setUserPreferences] = useState({
    budget: '',
    category: '',
    style: '',
  });

  const {
    messages,
    sendText,
    connectionState,
    isLoading,
  } = useMynaClient({
    webrtcURL: '/api/offer',
    websocketURL: 'wss://api.myshop.com/ws/recommendations',
    autoConnect: true,
  });

  const handleQuickRecommendation = (category: string) => {
    sendText(`I'm looking for ${category} recommendations`);
    setIsOpen(true);
  };

  return (
    <div className="product-page">
      {/* Quick recommendation buttons */}
      <div className="recommendation-widget bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-3">Need help choosing?</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => handleQuickRecommendation('phones')}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            📱 Find Phone
          </button>
          <button
            onClick={() => handleQuickRecommendation('laptops')}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            💻 Find Laptop
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="bg-gray-500 text-white px-3 py-1 rounded"
          >
            💬 Chat
          </button>
        </div>
      </div>

      {/* Collapsible chat interface */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-white border rounded-lg shadow-lg">
          <div className="p-3 border-b bg-blue-500 text-white rounded-t-lg">
            <div className="flex justify-between items-center">
              <span>Product Assistant</span>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3">
              {messages.map(msg => (
                <div key={msg.id} className={`mb-2 ${
                  msg.role === 'user' ? 'text-right' : 'text-left'
                }`}>
                  <div className={`inline-block p-2 rounded ${
                    msg.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-3 border-t">
              <input
                type="text"
                placeholder="Ask about products..."
                className="w-full border rounded px-2 py-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    sendText(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductRecommendationBot;
```

---

## SaaS Application Support

### In-App Help Assistant

```tsx
import React, { useState, useContext } from 'react';
import { Myna, createTheme } from 'myna-sdk';

// Context for user information
const UserContext = React.createContext();

const saasTheme = createTheme({
  colors: {
    primary: '#3b82f6',
    secondary: '#6366f1',
    background: '#f8fafc',
  },
});

function SaaSHelpAssistant() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const user = useContext(UserContext);

  return (
    <div className="saas-dashboard">
      {/* Your SaaS app header */}
      <header className="bg-white shadow-sm border-b p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600"
          >
            💬 Help
          </button>
          <div className="flex items-center space-x-2">
            <span>Welcome, {user?.name}</span>
            <img src={user?.avatar} className="w-8 h-8 rounded-full" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex h-screen">
        <nav className="w-64 bg-gray-50 border-r p-4">
          {/* Navigation */}
        </nav>
        
        <main className="flex-1 p-6">
          {/* Dashboard content */}
        </main>

        {/* Help assistant slide-out */}
        <div className={`bg-white border-l shadow-lg transition-all duration-300 ${
          isHelpOpen ? 'w-96' : 'w-0 overflow-hidden'
        }`}>
          {isHelpOpen && (
            <Myna
              webrtcURL="https://api.mysaas.com/api/offer"
              websocketURL="wss://api.mysaas.com/ws/help"
              bubbleEnabled={false}
              options={{
                theme: saasTheme,
                agentName: "Help Assistant",
                logoUrl: "/help-icon.svg",
                mcpEndpoints: [
                  {
                    name: "user-context",
                    url: `https://api.mysaas.com/mcp/user/${user?.id}`,
                  },
                  {
                    name: "feature-docs",
                    url: "https://api.mysaas.com/mcp/docs",
                  },
                ],
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default SaaSHelpAssistant;
```

### Onboarding Coach

```tsx
import React, { useState, useEffect } from 'react';
import { Myna, createTheme } from 'myna-sdk';

const onboardingTheme = createTheme({
  colors: {
    primary: '#10b981', // Green for progress
    secondary: '#6ee7b7',
    background: '#f0fdf4',
  },
});

function OnboardingCoach() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCoachVisible, setIsCoachVisible] = useState(true);

  const onboardingSteps = [
    { id: 1, title: "Welcome to our platform!", completed: true },
    { id: 2, title: "Set up your profile", completed: false },
    { id: 3, title: "Invite team members", completed: false },
    { id: 4, title: "Create your first project", completed: false },
  ];

  return (
    <div className="onboarding-layout flex h-screen">
      {/* Progress sidebar */}
      <div className="w-80 bg-green-50 border-r p-6">
        <h2 className="text-xl font-semibold mb-6">Getting Started</h2>
        
        <div className="space-y-4">
          {onboardingSteps.map(step => (
            <div key={step.id} className={`p-3 rounded-lg border ${
              step.completed 
                ? 'bg-green-100 border-green-300' 
                : currentStep === step.id
                ? 'bg-blue-100 border-blue-300'
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                  step.completed ? 'bg-green-500 text-white' : 'bg-gray-300'
                }`}>
                  {step.completed ? '✓' : step.id}
                </div>
                <span className="font-medium">{step.title}</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setIsCoachVisible(!isCoachVisible)}
          className="mt-6 w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
        >
          {isCoachVisible ? 'Hide Coach' : 'Show Coach'}
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 relative">
        {/* Your onboarding content */}
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">
            Step {currentStep}: {onboardingSteps[currentStep - 1].title}
          </h1>
          {/* Step-specific content */}
        </div>

        {/* Onboarding coach */}
        {isCoachVisible && (
          <div className="absolute bottom-4 right-4 w-80 h-96">
            <Myna
              webrtcURL="https://api.mysaas.com/api/offer"
              websocketURL="wss://api.mysaas.com/ws/onboarding"
              bubbleEnabled={false}
              options={{
                theme: onboardingTheme,
                agentName: "Onboarding Coach",
                logoUrl: "/coach-icon.svg",
                mcpEndpoints: [
                  {
                    name: "onboarding-progress",
                    url: `https://api.mysaas.com/mcp/onboarding/${currentStep}`,
                  },
                ],
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingCoach;
```

---

## Educational Platform

### Learning Assistant

```tsx
import React, { useState } from 'react';
import { Myna, createTheme } from 'myna-sdk';

const educationTheme = createTheme({
  colors: {
    primary: '#7c3aed', // Purple for education
    secondary: '#a855f7',
    background: '#faf5ff',
  },
  typography: {
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
});

function LearningAssistant() {
  const [currentLesson, setCurrentLesson] = useState('javascript-basics');
  const [studyMode, setStudyMode] = useState('interactive');

  return (
    <div className="learning-platform">
      {/* Course navigation */}
      <nav className="bg-purple-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold">Learn JavaScript</h1>
          <div className="flex items-center space-x-4">
            <span>Progress: 65%</span>
            <div className="w-32 bg-purple-400 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{width: '65%'}}></div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex h-screen">
        {/* Lesson content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">JavaScript Variables</h2>
          
          <div className="prose max-w-none">
            <p>In JavaScript, variables are used to store data values...</p>
            
            {/* Code example */}
            <div className="bg-gray-100 p-4 rounded-lg my-4">
              <code>
                {`let name = "John";
const age = 30;
var city = "New York";`}
              </code>
            </div>

            {/* Interactive exercise */}
            <div className="bg-blue-50 p-4 rounded-lg my-6">
              <h3 className="font-semibold mb-2">Try it yourself:</h3>
              <textarea 
                className="w-full p-2 border rounded"
                placeholder="Write your JavaScript code here..."
                rows={4}
              />
              <button className="mt-2 bg-blue-500 text-white px-4 py-2 rounded">
                Run Code
              </button>
            </div>
          </div>
        </main>

        {/* Learning assistant sidebar */}
        <aside className="w-96 border-l bg-purple-50">
          <div className="p-4 border-b bg-purple-100">
            <h3 className="font-semibold">Learning Assistant</h3>
            <p className="text-sm text-purple-600">Ask me anything about this lesson!</p>
          </div>

          <Myna
            webrtcURL="https://api.learnplatform.com/api/offer"
            websocketURL="wss://api.learnplatform.com/ws/tutor"
            bubbleEnabled={false}
            options={{
              theme: educationTheme,
              agentName: "Learning Assistant",
              logoUrl: "/tutor-icon.svg",
              mcpEndpoints: [
                {
                  name: "lesson-context",
                  url: `https://api.learnplatform.com/mcp/lesson/${currentLesson}`,
                },
                {
                  name: "code-examples",
                  url: "https://api.learnplatform.com/mcp/examples",
                },
                {
                  name: "quiz-generator",
                  url: "https://api.learnplatform.com/mcp/quiz",
                },
              ],
            }}
          />
        </aside>
      </div>
    </div>
  );
}

export default LearningAssistant;
```

---

## Healthcare Assistance

### Patient Support Chat

```tsx
import React, { useState } from 'react';
import { Myna, createTheme } from 'myna-sdk';

const healthcareTheme = createTheme({
  colors: {
    primary: '#059669', // Medical green
    secondary: '#10b981',
    background: '#f0fdfa',
    surface: '#ffffff',
  },
  borderRadius: {
    lg: '0.75rem',
  },
});

function PatientSupportChat() {
  const [patientInfo] = useState({
    id: 'P123456',
    name: 'John Doe',
    lastVisit: '2024-01-15',
  });

  return (
    <div className="healthcare-portal">
      <header className="bg-green-600 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-xl font-semibold">Patient Portal</h1>
        </div>
      </header>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Patient info */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Your Health Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded">
                  <h3 className="font-medium">Next Appointment</h3>
                  <p className="text-green-600">March 15, 2024</p>
                </div>
                <div className="p-3 bg-blue-50 rounded">
                  <h3 className="font-medium">Last Visit</h3>
                  <p className="text-blue-600">{patientInfo.lastVisit}</p>
                </div>
              </div>
            </div>

            {/* Health records, prescriptions, etc. */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              {/* Health records content */}
            </div>
          </div>

          {/* Support assistant */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-green-600 text-white p-4">
              <h3 className="font-semibold">Healthcare Assistant</h3>
              <p className="text-sm text-green-100">
                Ask about your health, appointments, or medications
              </p>
            </div>
            
            <div style={{ height: '500px' }}>
              <Myna
                webrtcURL="https://api.healthportal.com/api/offer"
                websocketURL="wss://api.healthportal.com/ws/patient-support"
                bubbleEnabled={false}
                options={{
                  theme: healthcareTheme,
                  agentName: "Health Assistant",
                  logoUrl: "/health-icon.svg",
                  mcpEndpoints: [
                    {
                      name: "patient-records",
                      url: `https://api.healthportal.com/mcp/patient/${patientInfo.id}`,
                      apiKey: process.env.REACT_APP_HEALTH_API_KEY,
                    },
                    {
                      name: "appointment-system",
                      url: "https://api.healthportal.com/mcp/appointments",
                    },
                    {
                      name: "medication-info",
                      url: "https://api.healthportal.com/mcp/medications",
                    },
                  ],
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientSupportChat;
```

---

## Multi-language Support

### Internationalized Assistant

```tsx
import React, { useState, useContext } from 'react';
import { Myna, createTheme } from 'myna-sdk';

const LanguageContext = React.createContext();

function MultiLanguageAssistant() {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  
  const languages = {
    en: { name: 'English', code: 'en' },
    es: { name: 'Español', code: 'es' },
    fr: { name: 'Français', code: 'fr' },
    de: { name: 'Deutsch', code: 'de' },
    zh: { name: '中文', code: 'zh' },
  };

  const getLocalizedAgentName = (lang: string) => {
    const names = {
      en: 'AI Assistant',
      es: 'Asistente IA',
      fr: 'Assistant IA',
      de: 'KI-Assistent',
      zh: 'AI助手',
    };
    return names[lang] || names.en;
  };

  return (
    <div className="multi-language-app">
      {/* Language selector */}
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold">Global Support</h1>
          
          <select
            value={currentLanguage}
            onChange={(e) => setCurrentLanguage(e.target.value)}
            className="bg-blue-500 border border-blue-400 rounded px-3 py-1"
          >
            {Object.entries(languages).map(([code, lang]) => (
              <option key={code} value={code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">
            Welcome to Our Global Platform
          </h2>
          <p className="text-gray-600">
            Get help in your preferred language
          </p>
        </div>

        {/* Floating assistant with language support */}
        <Myna
          key={currentLanguage} // Force re-mount on language change
          webrtcURL="https://api.global.com/api/offer"
          websocketURL={`wss://api.global.com/ws/support/${currentLanguage}`}
          options={{
            agentName: getLocalizedAgentName(currentLanguage),
            logoUrl: "/global-assistant.svg",
            mcpEndpoints: [
              {
                name: "translation-context",
                url: `https://api.global.com/mcp/i18n/${currentLanguage}`,
              },
              {
                name: "local-support",
                url: `https://api.global.com/mcp/support/${currentLanguage}`,
              },
            ],
          }}
        />
      </main>
    </div>
  );
}

export default MultiLanguageAssistant;
```

---

## Advanced Patterns

### Context-Aware Assistant

```tsx
import React, { useState, useEffect } from 'react';
import { useMynaClient } from 'myna-sdk';

function ContextAwareAssistant() {
  const [userContext, setUserContext] = useState({
    currentPage: 'dashboard',
    userRole: 'admin',
    recentActions: [],
    preferences: {},
  });

  const {
    messages,
    sendText,
    connectionState,
  } = useMynaClient({
    webrtcURL: '/api/offer',
    websocketURL: 'wss://api.contextual.com/ws/smart-assist',
  });

  // Update context based on user actions
  useEffect(() => {
    const handleRouteChange = () => {
      setUserContext(prev => ({
        ...prev,
        currentPage: window.location.pathname,
        recentActions: [...prev.recentActions, {
          type: 'navigation',
          page: window.location.pathname,
          timestamp: new Date(),
        }].slice(-10), // Keep last 10 actions
      }));
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Smart suggestions based on context
  const getContextualSuggestions = () => {
    const suggestions = {
      '/dashboard': [
        "Show me today's metrics",
        "What needs my attention?",
        "Generate weekly report",
      ],
      '/users': [
        "How many new users this week?",
        "Show user engagement stats",
        "Help with user management",
      ],
      '/settings': [
        "How do I change notifications?",
        "Explain security settings",
        "Help with integrations",
      ],
    };

    return suggestions[userContext.currentPage] || [
      "How can I help you?",
      "What would you like to know?",
      "Ask me anything!",
    ];
  };

  const handleContextualQuery = (suggestion: string) => {
    // Add context to the query
    const contextualQuery = `${suggestion} (Current page: ${userContext.currentPage}, Role: ${userContext.userRole})`;
    sendText(contextualQuery);
  };

  return (
    <div className="context-aware-interface">
      <div className="smart-suggestions bg-blue-50 p-4 rounded-lg mb-4">
        <h3 className="font-semibold mb-2">Quick Help</h3>
        <div className="space-y-2">
          {getContextualSuggestions().map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleContextualQuery(suggestion)}
              className="block w-full text-left p-2 bg-white rounded border hover:bg-gray-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Context display for debugging */}
      <div className="context-debug bg-gray-100 p-3 rounded text-sm mb-4">
        <strong>Context:</strong> Page: {userContext.currentPage}, 
        Role: {userContext.userRole}, 
        Recent actions: {userContext.recentActions.length}
      </div>

      {/* Chat interface */}
      <div className="chat-interface">
        {messages.map(msg => (
          <div key={msg.id} className="message mb-2">
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContextAwareAssistant;
```

---

For complete implementation details, see:
- [Getting Started Guide](./myna-sdk-getting-started.md)
- [API Reference](./myna-sdk-api-reference.md)
- [Customization Guide](./myna-sdk-customization.md)
- [Troubleshooting](./myna-sdk-troubleshooting.md) 