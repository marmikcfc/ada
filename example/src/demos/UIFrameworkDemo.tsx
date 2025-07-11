import React, { useState } from 'react';
import Genux from '../../../packages/genux-sdk/src/components/Genux';

/**
 * Demo: UI Framework Support Testing
 * 
 * This demonstrates the new UI Framework Support feature that allows
 * the backend to generate framework-optimized HTML content with
 * automatic interaction handling.
 */
const UIFrameworkDemo: React.FC = () => {
  const [selectedFramework, setSelectedFramework] = useState<'inline' | 'tailwind' | 'chakra'>('inline');

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
          
          {(['inline', 'tailwind', 'chakra'] as const).map((framework) => (
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
            backgroundColor: selectedFramework === 'inline' ? '#dbeafe' : 
                           selectedFramework === 'tailwind' ? '#ecfdf5' : '#fef3c7',
            color: selectedFramework === 'inline' ? '#1e40af' : 
                   selectedFramework === 'tailwind' ? '#065f46' : '#92400e',
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
{selectedFramework === 'inline' ? `<!-- Inline Styles Example -->
<div style="max-width: 400px; margin: 20px auto; padding: 24px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  <h2 style="margin: 0 0 16px 0; color: #1f2937;">User Preferences</h2>
  <form id="user-prefs" style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <label style="display: block; margin-bottom: 4px; font-weight: 500; color: #374151;">Email</label>
      <input type="email" name="email" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;" placeholder="you@example.com" />
    </div>
    <button type="submit" onclick="window.genuxSDK.handleFormSubmit(event, 'user-prefs')" style="background: #3b82f6; color: white; padding: 12px; border: none; border-radius: 6px; cursor: pointer;">Save Preferences</button>
  </form>
</div>` :
selectedFramework === 'tailwind' ? `<!-- Tailwind CSS Example -->
<div class="max-w-md mx-auto bg-white rounded-xl shadow-md p-6 m-4">
  <h2 class="text-2xl font-bold text-gray-900 mb-4">User Preferences</h2>
  <form id="user-prefs" class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
      <input type="email" name="email" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
    </div>
    <button type="submit" onclick="window.genuxSDK.handleFormSubmit(event, 'user-prefs')" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">Save Preferences</button>
  </form>
</div>` : `<!-- Chakra UI Example -->
<div data-chakra-component="Box" style="max-width: 400px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 24px;">
  <h2 data-chakra-component="Heading" style="font-size: 24px; font-weight: bold; color: #1a202c; margin-bottom: 16px;">User Preferences</h2>
  <form id="user-prefs" style="display: flex; flex-direction: column; gap: 16px;">
    <div data-chakra-component="FormControl">
      <label data-chakra-component="FormLabel" style="font-size: 14px; font-weight: 500; color: #4a5568; margin-bottom: 4px; display: block;">Email Address</label>
      <input type="email" name="email" data-chakra-component="Input" style="width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px;" placeholder="you@example.com" />
    </div>
    <button type="submit" data-chakra-component="Button" onclick="window.genuxSDK.handleFormSubmit(event, 'user-prefs')" style="width: 100%; background: #3182ce; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer;">Save Preferences</button>
  </form>
</div>`}
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
            <Genux
              webrtcURL="/api/offer"
              websocketURL="/ws/messages"
              bubbleEnabled={false}
              disableVoice={true}
              options={{
                agentName: "UI Framework Assistant",
                agentSubtitle: `Testing ${selectedFramework} framework support`,
                uiFramework: selectedFramework,
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