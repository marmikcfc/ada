/**
 * JSX Runtime Compilation Demo
 * 
 * Demonstrates the runtime JSX compilation functionality with ShadCN components.
 * This demo shows how JSX code from the backend can be compiled and rendered
 * dynamically on the client side.
 */

import React, { useState } from 'react';
import { DynamicJSXRenderer } from '../components/core/DynamicJSXRenderer';
import { jsxCompiler } from '../services/jsxCompiler';
import { lightTheme, crayonLightTheme } from '../theming/defaultTheme';

// Sample JSX components for testing
const SAMPLE_JSX_COMPONENTS = {
  'ShadCN Card': `function ContactCard(props) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = { name, email };
    props.onFormSubmit?.('contact-form', formData);
  };
  
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm max-w-md">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight">Contact Form</h3>
        <p className="text-sm text-muted-foreground">Enter your contact information</p>
      </div>
      <div className="p-6 pt-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Name
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                props.onInputChange?.('name', e.target.value);
              }}
              placeholder="Enter your name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Email
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                props.onInputChange?.('email', e.target.value);
              }}
              placeholder="Enter your email"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="flex gap-2">
            <button 
              type="submit"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Submit
            </button>
            <button 
              type="button"
              onClick={() => props.onButtonClick?.('clear-form', {})}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}`,

  'Data Table': `function UserDataTable(props) {
  const [users] = React.useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
  ]);
  
  return (
    <div className="w-full">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">User Management</h3>
          <p className="text-sm text-muted-foreground">Manage your users and their status</p>
        </div>
        <div className="p-6 pt-0">
          <div className="w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {users.map((user) => (
                  <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">{user.name}</td>
                    <td className="p-4 align-middle">{user.email}</td>
                    <td className="p-4 align-middle">
                      <div className={\\`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 \\${
                        user.status === 'Active' 
                          ? 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          : 'border-destructive/50 text-destructive'
                      }\\`}>
                        {user.status}
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => props.onButtonClick?.('edit-user', { userId: user.id })}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => props.onButtonClick?.('delete-user', { userId: user.id })}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-destructive hover:text-destructive-foreground h-8 w-8"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}`,

  'Alert Component': `function AlertComponent(props) {
  const [alertType, setAlertType] = React.useState('default');
  
  return (
    <div className="space-y-4 max-w-md">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Alert Demo</h3>
          <p className="text-sm text-muted-foreground">Test different alert types</p>
        </div>
        <div className="p-6 pt-0 space-y-4">
          <div className="flex gap-2">
            <button 
              onClick={() => setAlertType('default')}
              className={\\`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 \\${
                alertType === 'default' 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
              }\\`}
            >
              Default
            </button>
            <button 
              onClick={() => setAlertType('destructive')}
              className={\\`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 \\${
                alertType === 'destructive' 
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
              }\\`}
            >
              Error
            </button>
          </div>
          
          <div className={\\`relative w-full rounded-lg border p-4 \\${
            alertType === 'destructive' 
              ? 'border-destructive/50 text-destructive dark:border-destructive'
              : ''
          }\\`}>
            <h5 className="mb-1 font-medium leading-none tracking-tight">
              {alertType === 'destructive' ? 'Error Alert' : 'Info Alert'}
            </h5>
            <div className="text-sm [&_p]:leading-relaxed">
              {alertType === 'destructive' 
                ? 'Something went wrong. Please try again later.'
                : 'This is a sample alert component with dynamic styling.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`
};

// Backend JSX Response simulation
const BACKEND_JSX_RESPONSE = {
  "jsxContent": SAMPLE_JSX_COMPONENTS['ShadCN Card'],
  "contentType": "jsx",
  "framework": "shadcn",
  "componentName": "ContactCard",
  "title": "Contact Form"
};

export default function JSXRuntimeCompilationDemo() {
  const [selectedComponent, setSelectedComponent] = useState<string>('ShadCN Card');
  const [compilationStats, setCompilationStats] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showBackendFormat, setShowBackendFormat] = useState(false);

  // Interaction handlers
  const handleButtonClick = (actionType: string, context: any) => {
    const log = `🔘 Button clicked: ${actionType} with context: ${JSON.stringify(context)}`;
    setLogs(prev => [...prev, log]);
    console.log(log);
  };

  const handleFormSubmit = (formId: string, formData: any) => {
    const log = `📝 Form submitted: ${formId} with data: ${JSON.stringify(formData)}`;
    setLogs(prev => [...prev, log]);
    console.log(log);
  };

  const handleInputChange = (fieldName: string, value: any) => {
    const log = `✏️ Input changed: ${fieldName} = ${value}`;
    setLogs(prev => [...prev, log]);
    console.log(log);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const updateStats = () => {
    const stats = jsxCompiler.getCacheStats();
    setCompilationStats(stats);
  };

  React.useEffect(() => {
    updateStats();
  }, [selectedComponent]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            JSX Runtime Compilation Demo
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            Test dynamic JSX compilation and rendering with ShadCN components
          </p>

          {/* Component Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Select Component to Test:
            </label>
            <select
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
              style={{
                width: '300px',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              {Object.keys(SAMPLE_JSX_COMPONENTS).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Format Toggle */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showBackendFormat}
                onChange={(e) => setShowBackendFormat(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Show Backend JSON Format
            </label>
          </div>

          {/* Compilation Stats */}
          {compilationStats && (
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '24px'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Compilation Stats:
              </h4>
              <div style={{ fontSize: '12px', color: '#0369a1' }}>
                Cache Size: {compilationStats.size} / {compilationStats.maxSize} components
              </div>
              <button
                onClick={updateStats}
                style={{
                  marginTop: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#0ea5e9',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Refresh Stats
              </button>
            </div>
          )}

          {/* JSX Source Code Display */}
          {showBackendFormat ? (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Backend Response Format:
              </h4>
              <pre style={{
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '16px',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '300px'
              }}>
                {JSON.stringify({
                  ...BACKEND_JSX_RESPONSE,
                  jsxContent: SAMPLE_JSX_COMPONENTS[selectedComponent]
                }, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                JSX Source Code:
              </h4>
              <pre style={{
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '16px',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '300px'
              }}>
                {SAMPLE_JSX_COMPONENTS[selectedComponent]}
              </pre>
            </div>
          )}

          {/* Rendered Component */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Rendered Component:
            </h4>
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: '#ffffff'
            }}>
              <DynamicJSXRenderer
                key={selectedComponent} // Force re-render when component changes
                jsxContent={showBackendFormat ? JSON.stringify({
                  ...BACKEND_JSX_RESPONSE,
                  jsxContent: SAMPLE_JSX_COMPONENTS[selectedComponent]
                }) : SAMPLE_JSX_COMPONENTS[selectedComponent]}
                componentName={selectedComponent.replace(/\s+/g, '')}
                crayonTheme={crayonLightTheme}
                onButtonClick={handleButtonClick}
                onFormSubmit={handleFormSubmit}
                onInputChange={handleInputChange}
                enableCaching={true}
              />
            </div>
          </div>

          {/* Interaction Logs */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600' }}>
                Interaction Logs ({logs.length}):
              </h4>
              <button
                onClick={clearLogs}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Clear Logs
              </button>
            </div>
            <div style={{
              backgroundColor: '#1f2937',
              color: '#f9fafb',
              borderRadius: '6px',
              padding: '16px',
              fontSize: '12px',
              fontFamily: 'monospace',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {logs.length === 0 ? (
                <div style={{ color: '#9ca3af' }}>
                  No interactions yet. Try interacting with the component above.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} style={{ marginBottom: '4px' }}>
                    [{new Date().toLocaleTimeString()}] {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
            How It Works
          </h2>
          <div style={{ lineHeight: '1.6' }}>
            <p style={{ marginBottom: '12px' }}>
              This demo shows the complete JSX runtime compilation pipeline:
            </p>
            <ol style={{ paddingLeft: '20px', marginBottom: '16px' }}>
              <li><strong>Backend Generation:</strong> ShadCN prompt generates JSX components</li>
              <li><strong>Client Reception:</strong> JSX code received as JSON response</li>
              <li><strong>Runtime Compilation:</strong> Babel Standalone compiles JSX to JavaScript</li>
              <li><strong>Component Creation:</strong> JavaScript code executed to create React component</li>
              <li><strong>Dynamic Rendering:</strong> Component rendered with error boundaries and context</li>
              <li><strong>Interaction Handling:</strong> User interactions captured and processed</li>
            </ol>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              All components are cached for performance and include proper error handling.
              The compilation happens entirely in the browser using Babel Standalone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}