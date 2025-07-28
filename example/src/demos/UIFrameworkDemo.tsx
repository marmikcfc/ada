import React, { useState } from 'react';
import { ConfigurableGeUIClient } from '../ConfigurableGeUIClient';

/**
 * Demo: UI Framework Support Testing
 * 
 * This demonstrates the new UI Framework Support feature that allows
 * the backend to generate framework-optimized HTML content with
 * automatic interaction handling.
 */
const UIFrameworkDemo: React.FC = () => {
  const [selectedFramework, setSelectedFramework] = useState<'tailwind' | 'shadcn' | 'c1'>('tailwind');

  // Custom interaction handlers for testing
  const handleFormSubmit = (formId: string, formData: FormData) => {
    console.log('Form submitted:', { formId, data: Object.fromEntries(formData) });
    alert(`Form "${formId}" submitted! Check console for details.`);
  };

  const handleButtonClick = (actionType: string, context: any) => {
    console.log('Button clicked:', { actionType, context });
    alert(`Button action: "${actionType}". Check console for context.`);
  };

  const handleInputChange = (fieldName: string, value: any) => {
    console.log('Input changed:', { fieldName, value });
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      {/* Configuration Sidebar */}
      <div style={{
        width: '300px',
        backgroundColor: '#1e293b',
        color: 'white',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#8b5cf6',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            UI
          </div>
          <span style={{ fontSize: '18px', fontWeight: '600' }}>Framework Test</span>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Framework Selection</h3>
          
          {(['tailwind', 'shadcn', 'c1'] as const).map((framework) => (
            <label key={framework} style={{
              display: 'block',
              margin: '8px 0',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: selectedFramework === framework ? '#374151' : 'transparent'
            }}>
              <input
                type="radio"
                name="framework"
                value={framework}
                checked={selectedFramework === framework}
                onChange={(e) => setSelectedFramework(e.target.value as any)}
                style={{ marginRight: '8px' }}
              />
              {framework.charAt(0).toUpperCase() + framework.slice(1)}
            </label>
          ))}
        </div>

        <div style={{
          backgroundColor: '#374151',
          padding: '16px',
          borderRadius: '6px',
          fontSize: '14px',
          marginBottom: '24px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>🔧 Test Instructions</h4>
          <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', lineHeight: '1.6' }}>
            <li>Select a UI framework above</li>
            <li>Type "html" to test HTML content rendering</li>
            <li>Try form interactions and button clicks</li>
            <li>Check browser console for interaction events</li>
          </ol>
        </div>

        <div style={{
          backgroundColor: '#065f46',
          padding: '16px',
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          <h4 style={{ margin: '0 0 8px 0' }}>✅ Features Tested</h4>
          <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: '1.5' }}>
            <li>Framework preference transmission</li>
            <li>HTML content sanitization</li>
            <li>Global interaction handlers</li>
            <li>Form data collection</li>
            <li>Button click events</li>
            <li>Input change tracking</li>
          </ul>
        </div>

        <div style={{ marginTop: 'auto', padding: '16px', backgroundColor: '#7c3aed', borderRadius: '6px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Current Config</h4>
          <pre style={{ 
            margin: 0, 
            fontSize: '11px', 
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.4'
          }}>
{`uiFramework: "${selectedFramework}"
onFormSubmit: ✓ enabled
onButtonClick: ✓ enabled  
onInputChange: ✓ enabled`}
          </pre>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{
          backgroundColor: 'white',
          padding: '20px 32px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: '0 0 4px 0', color: '#1e293b', fontSize: '24px' }}>
              UI Framework Support Demo
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              Testing framework-optimized HTML generation and interaction handling
            </p>
          </div>
          <div style={{
            padding: '8px 16px',
            backgroundColor: selectedFramework === 'tailwind' ? '#ecfdf5' : 
                           selectedFramework === 'shadcn' ? '#fef3c7' : '#dbeafe',
            color: selectedFramework === 'tailwind' ? '#065f46' : 
                   selectedFramework === 'shadcn' ? '#92400e' : '#1e40af',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            📱 {selectedFramework.toUpperCase()}
          </div>
        </header>

        {/* Sample HTML for Testing */}
        <div style={{
          padding: '20px 32px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '16px' }}>
            Sample Framework HTML ({selectedFramework})
          </h3>
          <pre style={{
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#374151',
            border: '1px solid #e2e8f0',
            overflow: 'auto',
            maxHeight: '200px'
          }}>
{selectedFramework === 'tailwind' ? `<!-- Tailwind CSS Example -->
<div class="max-w-md mx-auto bg-white rounded-xl shadow-md p-6 m-4">
  <h2 class="text-2xl font-bold text-gray-900 mb-4">User Preferences</h2>
  <form id="user-prefs" class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
      <input type="email" name="email" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
    </div>
    <button type="submit" onclick="window.genuxSDK.handleFormSubmit(event, 'user-prefs')" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">Save Preferences</button>
  </form>
</div>` :
selectedFramework === 'shadcn' ? `<!-- ShadCN UI Example -->
<div class="mx-auto max-w-sm space-y-6 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
  <div class="space-y-2">
    <h2 class="text-2xl font-semibold tracking-tight">User Preferences</h2>
    <p class="text-sm text-muted-foreground">Update your account settings</p>
  </div>
  <form id="user-prefs" class="space-y-4">
    <div class="space-y-2">
      <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email Address</label>
      <input type="email" name="email" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="you@example.com" />
    </div>
    <button type="submit" onclick="window.genuxSDK.handleFormSubmit(event, 'user-prefs')" class="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">Save Preferences</button>
  </form>
</div>` : `<!-- C1 Component Example -->
<content>
{
  "component": "Card",
  "props": {
    "className": "max-w-md mx-auto",
    "children": [
      {
        "component": "CardHeader",
        "props": {
          "children": [
            {
              "component": "CardTitle",
              "props": { "text": "User Preferences" }
            },
            {
              "component": "CardDescription", 
              "props": { "text": "Update your account settings below" }
            }
          ]
        }
      },
      {
        "component": "CardContent",
        "props": {
          "children": [
            {
              "component": "Form",
              "props": {
                "id": "user-prefs",
                "onSubmit": "handleFormSubmit",
                "children": [
                  {
                    "component": "FormField",
                    "props": {
                      "label": "Email Address",
                      "children": [
                        {
                          "component": "Input",
                          "props": {
                            "type": "email",
                            "name": "email",
                            "placeholder": "you@example.com",
                            "required": true
                          }
                        }
                      ]
                    }
                  },
                  {
                    "component": "Button",
                    "props": {
                      "type": "submit",
                      "text": "Save Preferences",
                      "variant": "default",
                      "className": "w-full"
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  }
}
</content>`}
          </pre>
        </div>

        {/* Chat Interface */}
        <div style={{ flex: 1, padding: '32px' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            height: '100%',
            overflow: 'hidden'
          }}>
            <ConfigurableGeUIClient
              key={selectedFramework} // Force re-render when framework changes
              clientId={`ui-framework-${selectedFramework}`}
              connectionConfig={{
                client_id: `ui-framework-${selectedFramework}`,
                mcp_config: {
                  model: "gpt-4o-mini",
                  api_key_env: "OPENAI_API_KEY",
                  servers: []
                },
                visualization_provider: selectedFramework === 'c1' ? {
                  provider_type: "thesys", // C1 components for rich interactivity
                  model: "c1-nightly",
                  api_key_env: "THESYS_API_KEY"
                } : {
                  provider_type: "openai", // HTML generation for framework-specific styling
                  model: "gpt-4o-mini",
                  api_key_env: "OPENAI_API_KEY"
                },
                preferences: {
                  ui_framework: selectedFramework, // Framework-aware: Dynamic framework selection
                  theme: "default"
                }
              }}
              bubbleEnabled={false}
              disableVoice={true}
              options={{
                agentName: "UI Framework Assistant",
                agentSubtitle: `Testing ${selectedFramework} framework support with your framework detection system`,
                welcomeMessage: `Hi! I'm configured to generate ${selectedFramework === 'c1' ? 'C1 Components' : selectedFramework + ' HTML'} content. Try asking me to create forms, tables, dashboards, or interactive components to see framework-specific styling and your framework detection in action!`,
                onFormSubmit: handleFormSubmit,
                onButtonClick: handleButtonClick,
                onInputChange: handleInputChange,
                theme: {
                  colors: {
                    primary: "#8b5cf6",
                    secondary: "#7c3aed",
                    background: "#ffffff",
                    surface: "#f8fafc",
                    text: "#1e293b",
                    textSecondary: "#64748b",
                    border: "#e2e8f0"
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIFrameworkDemo;