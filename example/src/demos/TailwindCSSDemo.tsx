import React, { useState, useRef, useEffect } from 'react';
import GeUI from '../../../packages/geui-sdk/src/components/GeUI';

/**
 * Demo: Tailwind CSS & ShadCN Component Generation
 * 
 * This demonstrates the Tailwind CSS prompt system that generates
 * modern, responsive components using Tailwind utility classes
 * and ShadCN component patterns.
 */
const TailwindCSSDemo: React.FC = () => {
  const [interactionLog, setInteractionLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll interaction log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [interactionLog]);

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setInteractionLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Enhanced interaction handlers with detailed logging
  const handleFormSubmit = (formId: string, formData: FormData) => {
    const data = Object.fromEntries(formData);
    addToLog(`📋 Form submitted: "${formId}" with data: ${JSON.stringify(data)}`);
    console.log('Form submitted:', { formId, data });
    
    // Show success toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all';
    toast.textContent = `Form "${formId}" submitted successfully!`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  const handleButtonClick = (actionType: string, context: any) => {
    addToLog(`🖲️ Button clicked: "${actionType}" with context: ${JSON.stringify(context)}`);
    console.log('Button clicked:', { actionType, context });
  };

  const handleInputChange = (fieldName: string, value: any) => {
    addToLog(`✏️ Input changed: "${fieldName}" = "${value}"`);
    console.log('Input changed:', { fieldName, value });
  };

  // Sample prompts for users to try
  const samplePrompts = [
    {
      title: "📊 Dashboard Card",
      prompt: "Create a dashboard card showing user analytics with a chart placeholder, stats, and action buttons",
      description: "Generates a card with metrics, chart area, and interactive buttons"
    },
    {
      title: "📝 Registration Form", 
      prompt: "Build a user registration form with name, email, password, and terms checkbox",
      description: "Creates a complete form with validation styling and submit handling"
    },
    {
      title: "📋 Task List",
      prompt: "Design a task management interface with add task button and task items",
      description: "Interactive task list with checkboxes and action buttons"
    },
    {
      title: "💳 Pricing Card",
      prompt: "Make a pricing plan card with features list, price, and subscribe button",
      description: "Professional pricing card with feature highlights"
    },
    {
      title: "🔔 Notification Panel",
      prompt: "Create a notification center with different alert types and action buttons",
      description: "Alert system with success, warning, and error messages"
    },
    {
      title: "📱 Contact Card",
      prompt: "Design a contact profile card with avatar, info, and contact buttons",
      description: "User profile card with social actions"
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with prompts and logs */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tailwind CSS Demo</h2>
              <p className="text-sm text-gray-600">ShadCN Component Generation</p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h3 className="text-sm font-medium text-blue-900 mb-1">🎯 What This Tests</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Tailwind utility class generation</li>
              <li>• ShadCN component patterns</li>
              <li>• Responsive design breakpoints</li>
              <li>• Interactive element handling</li>
              <li>• Form validation & submission</li>
            </ul>
          </div>
        </div>

        {/* Sample Prompts */}
        <div className="flex-1 overflow-auto p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">💡 Try These Prompts</h3>
          <div className="space-y-2">
            {samplePrompts.map((sample, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{sample.title}</h4>
                  <button
                    onClick={() => navigator.clipboard.writeText(sample.prompt)}
                    className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-600 mb-2">{sample.description}</p>
                <code className="text-xs bg-gray-100 text-gray-800 p-2 rounded block font-mono">
                  {sample.prompt}
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* Interaction Log */}
        <div className="border-t border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">🔍 Interaction Log</h3>
          <div 
            ref={logRef}
            className="bg-gray-900 rounded-lg p-3 h-32 overflow-auto text-xs font-mono"
          >
            {interactionLog.length === 0 ? (
              <div className="text-gray-500">Waiting for interactions...</div>
            ) : (
              interactionLog.map((log, index) => (
                <div key={index} className="text-green-400 mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
          {interactionLog.length > 0 && (
            <button
              onClick={() => setInteractionLog([])}
              className="mt-2 text-xs text-gray-600 hover:text-gray-800 underline"
            >
              Clear Log
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Tailwind CSS Generation Demo
              </h1>
              <p className="text-gray-600">
                Chat with the AI to generate modern Tailwind components with ShadCN patterns
              </p>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Tailwind CSS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">ShadCN Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Interactive</span>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions Banner */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">💬</span>
              </div>
              <div>
                <h3 className="font-semibold">Try asking for Tailwind components!</h3>
                <p className="text-sm text-blue-100">
                  Example: "Create a dashboard card with user stats" or copy a prompt from the sidebar
                </p>
              </div>
            </div>
            <div className="bg-white/10 px-3 py-1 rounded-full text-sm font-medium">
              Framework: Tailwind CSS
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 p-8">
          <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <GeUI
              webrtcURL="/api/offer"
              websocketURL="/ws/per-connection-messages"
              bubbleEnabled={false}
              disableVoice={true}
              options={{
                agentName: "Tailwind CSS Assistant",
                agentSubtitle: "Generating modern components with utility classes",
                uiFramework: "tailwind",
                onFormSubmit: handleFormSubmit,
                onButtonClick: handleButtonClick,
                onInputChange: handleInputChange,
                theme: {
                  colors: {
                    primary: "#0ea5e9",
                    primaryHover: "#0284c7", 
                    secondary: "#06b6d4",
                    background: "#ffffff",
                    surface: "#f8fafc",
                    text: "#1e293b",
                    textSecondary: "#64748b",
                    border: "#e2e8f0",
                    chatUserBubble: "#0ea5e9",
                    chatUserText: "#ffffff",
                    chatAssistantBubble: "#f8fafc",
                    chatAssistantText: "#1e293b"
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Add Tailwind CSS for styling the demo itself */}
      <style>{`
        /* Ensure Tailwind CSS is loaded for the demo */
        @import url('https://cdn.tailwindcss.com/3.4.0/tailwind.min.css');
        
        /* Custom scrollbar for logs */
        .bg-gray-900::-webkit-scrollbar {
          width: 4px;
        }
        .bg-gray-900::-webkit-scrollbar-track {
          background: #374151;
        }
        .bg-gray-900::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default TailwindCSSDemo;