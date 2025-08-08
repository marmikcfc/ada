import React, { useState, useEffect, createContext, useContext, useCallback, useMemo, useRef } from 'react';
import { ConfigurableGeUIClient } from '../ConfigurableGeUIClient';
import { ThreadedChatWindow } from '../../../packages/geui-sdk/src/components/composite/ThreadedChatWindow';
import { useThreadContext } from '../../../packages/geui-sdk/src/contexts/ThreadContext';
import type { ThreadListProps, ChatWindowProps, Thread, Message } from '../../../packages/geui-sdk/src/types';
import { 
  lightTheme, 
  darkTheme, 
  defaultTheme,
  createTheme,
  toCrayonTheme
} from '../../../packages/geui-sdk/src/theming/defaultTheme';
import './demo-styles.css';

// Types for our configuration system
interface AIProvider {
  id: string;
  name: string;
  models: string[];
  apiKeyEnv: string;
}

interface VoiceSettings {
  enabled: boolean;
  provider: string;
  voice: 'male' | 'female';
  language: string;
}

interface MCPServer {
  id: string;
  name: string;
  url: string;
  transport: 'http';
  headers?: Record<string, string>;
  enabled: boolean;
}

interface UIFrameworkSettings {
  framework: 'crayon' | 'tailwind' | 'shadcn';
  visualizationLLM?: {
    provider: string;
    model: string;
    apiKeyEnv: string;
  };
}

interface ConfigurationState {
  aiProvider: {
    provider: string;
    model: string;
    apiKey: string;
  };
  voice: VoiceSettings;
  uiFramework: UIFrameworkSettings;
  mcpServers: MCPServer[];
  theme: {
    name: string;
    colors: any;
  };
}

// Default configuration
const DEFAULT_CONFIG: ConfigurationState = {
  aiProvider: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: ''
  },
  voice: {
    enabled: true,
    provider: 'default',
    voice: 'female',
    language: 'en-US'
  },
  uiFramework: {
    framework: 'crayon',
    visualizationLLM: {
      provider: 'thesys',
      model: 'c1-nightly',
      apiKeyEnv: 'THESYS_API_KEY'
    }
  },
  mcpServers: [],
  theme: {
    name: 'default',
    colors: defaultTheme
  }
};

// Available AI providers
const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    apiKeyEnv: 'OPENAI_API_KEY'
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022', 
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ],
    apiKeyEnv: 'ANTHROPIC_API_KEY'
  },
  {
    id: 'google',
    name: 'Google Gemini',
    models: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro'],
    apiKeyEnv: 'GOOGLE_API_KEY'
  }
];

// Context for configuration state
const ConfigurationContext = createContext<{
  config: ConfigurationState;
  updateConfig: (updates: Partial<ConfigurationState>) => void;
  resetConfig: () => void;
  exportConfig: () => string;
  importConfig: (configString: string) => boolean;
  applyConfig?: () => void;
  cancelPendingChanges?: () => void;
  hasPendingChanges?: boolean;
  isReconnecting?: boolean;
  actualConfig?: ConfigurationState;
}>({
  config: DEFAULT_CONFIG,
  updateConfig: () => {},
  resetConfig: () => {},
  exportConfig: () => '',
  importConfig: () => false
});

// Settings Modal Component
const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { 
    config, 
    updateConfig, 
    resetConfig, 
    exportConfig, 
    importConfig,
    applyConfig,
    cancelPendingChanges,
    hasPendingChanges 
  } = useContext(ConfigurationContext);
  const [activeTab, setActiveTab] = useState<'ai' | 'voice' | 'ui' | 'mcp' | 'theme'>('ai');
  const [importText, setImportText] = useState('');

  if (!isOpen) return null;

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(8px)'
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90%',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column'
  };

  const headerStyle: React.CSSProperties = {
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  };

  const tabsStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  };

  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    backgroundColor: isActive ? 'white' : 'transparent',
    borderBottom: isActive ? '2px solid #667eea' : '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: isActive ? '600' : '500',
    color: isActive ? '#667eea' : '#6b7280',
    transition: 'all 0.2s ease'
  });

  const renderAITab = () => (
    <div style={{ padding: '24px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1f2937' }}>AI Model Configuration</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
          Provider
        </label>
        <select
          value={config.aiProvider.provider}
          onChange={(e) => {
            const provider = AI_PROVIDERS.find(p => p.id === e.target.value);
            if (provider) {
              updateConfig({
                aiProvider: {
                  ...config.aiProvider,
                  provider: e.target.value,
                  model: provider.models[0]
                }
              });
            }
          }}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        >
          {AI_PROVIDERS.map(provider => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
          Model
        </label>
        <select
          value={config.aiProvider.model}
          onChange={(e) => updateConfig({
            aiProvider: { ...config.aiProvider, model: e.target.value }
          })}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        >
          {AI_PROVIDERS.find(p => p.id === config.aiProvider.provider)?.models.map(model => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
          API Key
        </label>
        <input
          type="password"
          value={config.aiProvider.apiKey}
          onChange={(e) => updateConfig({
            aiProvider: { ...config.aiProvider, apiKey: e.target.value }
          })}
          placeholder="Enter your API key"
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        />
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
          Required environment variable: {AI_PROVIDERS.find(p => p.id === config.aiProvider.provider)?.apiKeyEnv}
        </p>
      </div>
    </div>
  );

  const renderVoiceTab = () => (
    <div style={{ padding: '24px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1f2937' }}>Voice Configuration</h3>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: '500' }}>
          <input
            type="checkbox"
            checked={config.voice.enabled}
            onChange={(e) => updateConfig({
              voice: { ...config.voice, enabled: e.target.checked }
            })}
            style={{ marginRight: '12px', width: '20px', height: '20px' }}
          />
          Enable Voice Features (WebRTC)
        </label>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', marginLeft: '32px' }}>
          When enabled, a microphone button will appear in the message composer for voice input.
        </p>
      </div>
      
      {config.voice.enabled && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
              Voice Gender
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              {(['male', 'female'] as const).map(voice => (
                <label key={voice} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value={voice}
                    checked={config.voice.voice === voice}
                    onChange={(e) => updateConfig({
                      voice: { ...config.voice, voice: e.target.value as 'male' | 'female' }
                    })}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ textTransform: 'capitalize' }}>{voice}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
              Language
            </label>
            <select
              value={config.voice.language}
              onChange={(e) => updateConfig({
                voice: { ...config.voice, language: e.target.value }
              })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-ES">Spanish</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
              <option value="it-IT">Italian</option>
              <option value="pt-BR">Portuguese (Brazil)</option>
              <option value="ja-JP">Japanese</option>
              <option value="ko-KR">Korean</option>
              <option value="zh-CN">Chinese (Simplified)</option>
            </select>
          </div>

          <div style={{
            backgroundColor: '#dbeafe',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '24px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#1e3a8a', fontSize: '14px' }}>
              🎤 Voice Mode Active
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#1e3a8a', lineHeight: '1.4' }}>
              Click the microphone button in the message composer to use voice input. Your speech will be transcribed and sent as a message.
            </p>
          </div>
        </>
      )}
      
      {!config.voice.enabled && (
        <div style={{
          backgroundColor: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '24px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
            🔇 Voice Mode Disabled
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: '1.4' }}>
            Voice features are currently disabled. Enable voice mode above to use the microphone for speech input.
          </p>
        </div>
      )}
    </div>
  );

  const renderUITab = () => (
    <div style={{ padding: '24px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1f2937' }}>UI Framework Configuration</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
          CSS Framework
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { id: 'crayon', name: 'Crayon (C1 Components)', desc: 'Rich interactive components with built-in styling' },
            { id: 'tailwind', name: 'Pure Tailwind CSS', desc: 'Utility-first CSS framework for custom designs' },
            { id: 'shadcn', name: 'ShadCN/UI', desc: 'Modern component library built on Tailwind' }
          ].map(framework => (
            <label key={framework.id} style={{
              display: 'flex',
              alignItems: 'flex-start',
              cursor: 'pointer',
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: config.uiFramework.framework === framework.id ? '#f0f9ff' : 'white'
            }}>
              <input
                type="radio"
                value={framework.id}
                checked={config.uiFramework.framework === framework.id}
                onChange={(e) => updateConfig({
                  uiFramework: { 
                    ...config.uiFramework, 
                    framework: e.target.value as any 
                  }
                })}
                style={{ marginRight: '12px', marginTop: '2px' }}
              />
              <div>
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>{framework.name}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{framework.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {config.uiFramework.framework !== 'crayon' && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '16px', color: '#1f2937' }}>Visualization LLM</h4>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            When using {config.uiFramework.framework}, you need a visualization LLM to generate HTML content.
          </p>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
              Provider
            </label>
            <select
              value={config.uiFramework.visualizationLLM?.provider || 'openai'}
              onChange={(e) => {
                const provider = AI_PROVIDERS.find(p => p.id === e.target.value);
                updateConfig({
                  uiFramework: {
                    ...config.uiFramework,
                    visualizationLLM: {
                      provider: e.target.value,
                      model: provider?.models[0] || 'gpt-4o-mini',
                      apiKeyEnv: provider?.apiKeyEnv || 'OPENAI_API_KEY'
                    }
                  }
                });
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              {AI_PROVIDERS.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
              Model
            </label>
            <select
              value={config.uiFramework.visualizationLLM?.model || 'gpt-4o-mini'}
              onChange={(e) => updateConfig({
                uiFramework: {
                  ...config.uiFramework,
                  visualizationLLM: {
                    ...config.uiFramework.visualizationLLM!,
                    model: e.target.value
                  }
                }
              })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              {AI_PROVIDERS.find(p => p.id === config.uiFramework.visualizationLLM?.provider)?.models.map(model => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );

  const renderMCPTab = () => {
    const addMCPServer = () => {
      const newServer: MCPServer = {
        id: crypto.randomUUID(),
        name: 'New MCP Server',
        url: 'http://localhost:3001',
        transport: 'http',
        headers: {},
        enabled: true
      };
      updateConfig({
        mcpServers: [...config.mcpServers, newServer]
      });
    };

    const updateMCPServer = (id: string, updates: Partial<MCPServer>) => {
      updateConfig({
        mcpServers: config.mcpServers.map(server =>
          server.id === id ? { ...server, ...updates } : server
        )
      });
    };

    const removeMCPServer = (id: string) => {
      updateConfig({
        mcpServers: config.mcpServers.filter(server => server.id !== id)
      });
    };

    const addPresetServer = (preset: 'perplexity' | 'weather' | 'filesystem') => {
      const presets = {
        perplexity: {
          name: 'Perplexity Search',
          url: 'http://localhost:3001',
          headers: { 'Authorization': 'Bearer your-perplexity-api-key' }
        },
        weather: {
          name: 'Weather API',
          url: 'http://localhost:3002',
          headers: { 'X-API-Key': 'your-weather-api-key' }
        },
        filesystem: {
          name: 'Filesystem Tools',
          url: 'http://localhost:3003',
          headers: {}
        }
      };

      const preset_config = presets[preset];
      const newServer: MCPServer = {
        id: crypto.randomUUID(),
        ...preset_config,
        transport: 'http',
        enabled: true
      };
      updateConfig({
        mcpServers: [...config.mcpServers, newServer]
      });
    };

    return (
      <div style={{ padding: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1f2937' }}>MCP Server Configuration</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => addPresetServer('perplexity')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              + Perplexity Search
            </button>
            <button
              onClick={() => addPresetServer('weather')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              + Weather API
            </button>
            <button
              onClick={() => addPresetServer('filesystem')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              + Filesystem Tools
            </button>
            <button
              onClick={addMCPServer}
              style={{
                padding: '8px 16px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              + Custom Server
            </button>
          </div>
        </div>

        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {config.mcpServers.map(server => (
            <div key={server.id} style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              backgroundColor: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={server.enabled}
                    onChange={(e) => updateMCPServer(server.id, { enabled: e.target.checked })}
                  />
                  <input
                    type="text"
                    value={server.name}
                    onChange={(e) => updateMCPServer(server.id, { name: e.target.value })}
                    style={{
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      backgroundColor: 'transparent',
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  onClick={() => removeMCPServer(server.id)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#6b7280' }}>
                  URL
                </label>
                <input
                  type="text"
                  value={server.url}
                  onChange={(e) => updateMCPServer(server.id, { url: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#6b7280' }}>
                  Headers (JSON)
                </label>
                <textarea
                  value={JSON.stringify(server.headers || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const headers = JSON.parse(e.target.value);
                      updateMCPServer(server.id, { headers });
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    minHeight: '60px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {config.mcpServers.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px',
            padding: '40px 20px'
          }}>
            No MCP servers configured. Use the buttons above to add some.
          </div>
        )}
      </div>
    );
  };

  const renderThemeTab = () => {
    const themes = [
      { name: 'default', colors: defaultTheme, label: 'Default (GenUX Brand)' },
      { name: 'light', colors: lightTheme, label: 'Light Theme' },
      { name: 'dark', colors: darkTheme, label: 'Dark Theme' }
    ];

    return (
      <div style={{ padding: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1f2937' }}>Theme Configuration</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {themes.map(theme => (
            <label key={theme.name} style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '16px',
              border: '2px solid',
              borderColor: config.theme.name === theme.name ? theme.colors.colors.primary : '#e5e7eb',
              borderRadius: '8px',
              backgroundColor: config.theme.name === theme.name ? theme.colors.colors.primary + '10' : 'white'
            }}>
              <input
                type="radio"
                value={theme.name}
                checked={config.theme.name === theme.name}
                onChange={(e) => updateConfig({
                  theme: { name: e.target.value, colors: theme.colors }
                })}
                style={{ marginRight: '12px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{theme.label}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: theme.colors.colors.primary,
                    border: '1px solid #e5e7eb'
                  }} />
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: theme.colors.colors.secondary,
                    border: '1px solid #e5e7eb'
                  }} />
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: theme.colors.colors.background,
                    border: '1px solid #e5e7eb'
                  }} />
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'ai': return renderAITab();
      case 'voice': return renderVoiceTab();
      case 'ui': return renderUITab();
      case 'mcp': return renderMCPTab();
      case 'theme': return renderThemeTab();
      default: return renderAITab();
    }
  };

  return (
    <div style={modalStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={contentStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>
              ⚙️ Settings {hasPendingChanges && <span style={{ 
                backgroundColor: '#fbbf24', 
                color: '#78350f',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                marginLeft: '8px',
                fontWeight: '500'
              }}>Unsaved Changes</span>}
            </h2>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
              Configure AI models, UI frameworks, and MCP servers
            </p>
          </div>
          <button
            onClick={() => {
              if (hasPendingChanges) {
                if (confirm('You have unsaved changes. Discard them?')) {
                  cancelPendingChanges?.();
                  onClose();
                }
              } else {
                onClose();
              }
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Tabs */}
        <div style={tabsStyle}>
          <button
            style={tabButtonStyle(activeTab === 'ai')}
            onClick={() => setActiveTab('ai')}
          >
            🤖 AI Model
          </button>
          <button
            style={tabButtonStyle(activeTab === 'voice')}
            onClick={() => setActiveTab('voice')}
          >
            🎤 Voice
          </button>
          <button
            style={tabButtonStyle(activeTab === 'ui')}
            onClick={() => setActiveTab('ui')}
          >
            🎨 UI Framework
          </button>
          <button
            style={tabButtonStyle(activeTab === 'mcp')}
            onClick={() => setActiveTab('mcp')}
          >
            🔌 MCP Servers
          </button>
          <button
            style={tabButtonStyle(activeTab === 'theme')}
            onClick={() => setActiveTab('theme')}
          >
            🌈 Theme
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {renderContent()}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={resetConfig}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Reset to Defaults
            </button>
            <button
              onClick={() => {
                const configString = exportConfig();
                navigator.clipboard.writeText(configString);
                alert('Configuration copied to clipboard!');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Export Config
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {hasPendingChanges && (
              <>
                <button
                  onClick={() => {
                    cancelPendingChanges?.();
                    onClose();
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel Changes
                </button>
                <button
                  onClick={() => {
                    applyConfig?.();
                    onClose();
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    animation: 'pulse 2s infinite'
                  }}
                  title="This will reconnect with new configuration"
                >
                  ✓ Apply Changes
                </button>
              </>
            )}
            
            <input
              type="text"
              placeholder="Paste config to import"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '12px',
                width: '200px'
              }}
            />
            <button
              onClick={() => {
                if (importConfig(importText)) {
                  setImportText('');
                  alert('Configuration imported - click Apply Changes to use it');
                } else {
                  alert('Invalid configuration format');
                }
              }}
              disabled={!importText.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: importText.trim() ? '#667eea' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: importText.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom ThreadList with Settings Button
const CustomThreadListWithSettings: React.FC<ThreadListProps & { 
  onSettingsClick?: () => void;
  onCollapseChange?: (isCollapsed: boolean) => void;
}> = ({
  threads,
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onDeleteThread,
  onRenameThread,
  isCreatingThread,
  isLoading,
  onSettingsClick,
  onCollapseChange,
  theme
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    onCollapseChange?.(collapsed);
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'white',
      borderRight: '1px solid #e5e7eb',
      width: isCollapsed ? '60px' : '320px',
      transition: 'width 0.3s ease',
      overflow: 'hidden'
    }}>
      {isCollapsed ? (
        // Collapsed State
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 0',
          gap: '12px'
        }}>
          {/* Expand Button */}
          <button
            onClick={() => handleToggleCollapse(false)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'all 0.2s ease'
            }}
            title="Expand conversations"
          >
            →
          </button>

          {/* Thread Count */}
          <div style={{
            width: '40px',
            height: '32px',
            backgroundColor: '#f3f4f6',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '600',
            color: '#6b7280'
          }}>
            {threads.length}
          </div>

          {/* Quick Settings */}
          <button
            onClick={onSettingsClick}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'all 0.2s ease',
              marginTop: 'auto'
            }}
            title="Settings"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#667eea';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.borderColor = '#667eea';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            ⚙️
          </button>
        </div>
      ) : (
        // Expanded State
        <>
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                💬 Conversations
              </h3>
              <button
                onClick={() => handleToggleCollapse(true)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  transition: 'all 0.2s ease'
                }}
                title="Collapse conversations"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ←
              </button>
            </div>
            <button
              onClick={onCreateThread}
              disabled={isCreatingThread}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                opacity: isCreatingThread ? 0.6 : 1
              }}
            >
              {isCreatingThread ? '⏳ Creating...' : '➕ New Chat'}
            </button>
          </div>

          {/* Thread List */}
          <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                Loading conversations...
              </div>
            ) : threads.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                No conversations yet. Create your first chat!
              </div>
            ) : (
              threads.map(thread => (
                <div
                  key={thread.id}
                  style={{
                    padding: '12px',
                    backgroundColor: thread.id === activeThreadId ? '#667eea' : 'white',
                    color: thread.id === activeThreadId ? 'white' : '#374151',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid',
                    borderColor: thread.id === activeThreadId ? '#667eea' : '#e5e7eb',
                    position: 'relative',
                    group: 'thread-item'
                  }}
                  onMouseEnter={(e) => {
                    if (thread.id !== activeThreadId) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }
                    // Show delete button on hover
                    const deleteBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                    if (deleteBtn) deleteBtn.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    if (thread.id !== activeThreadId) {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                    // Hide delete button
                    const deleteBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                    if (deleteBtn) deleteBtn.style.opacity = '0';
                  }}
                >
                  <div 
                    onClick={() => onSelectThread(thread.id)}
                    style={{ position: 'relative' }}
                  >
                    <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px' }}>
                      {thread.title}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      opacity: 0.8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{thread.messageCount} messages</span>
                      <span>{new Date(thread.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Delete Button */}
                  {onDeleteThread && (
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${thread.title}"?`)) {
                          onDeleteThread(thread.id);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        opacity: 0,
                        transition: 'opacity 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Delete conversation"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Settings Button Footer */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}>
            <button
              onClick={onSettingsClick}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#667eea';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = '#667eea';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            >
              ⚙️ Settings
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Custom ThreadedChatWindow with Settings Integration
const CustomThreadedChatWindowWithSettings: React.FC<any> = (props) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isThreadListCollapsed, setIsThreadListCollapsed] = useState(false);
  
  // Debug: Log all props to see what's being passed
  useEffect(() => {
    console.log('[CustomThreadedChatWindowWithSettings] Full props inspection:', {
      hasOnSendMessage: !!props.onSendMessage,
      onSendMessageType: typeof props.onSendMessage,
      hasMessages: !!props.messages,
      messageCount: props.messages?.length || 0,
      allPropKeys: Object.keys(props),
      onSendMessage: props.onSendMessage
    });
  }, [props.onSendMessage]);
  
  // Since enableThreadManagement=true on GeUI, it's already using ThreadInterface
  // and passing all the thread data through props. We don't need to create our own.
  
  // Get thread context from GeUI (when enableThreadManagement=true)
  const threadContext = useThreadContext();
  
  // Extract what we need from context or props
  const threads = threadContext?.threads || props.threads || [];
  const activeThreadId = threadContext?.activeThreadId || props.activeThreadId;
  const messages = threadContext?.messages || props.messages || [];
  const isLoading = threadContext?.isLoading || props.isLoading || false;
  const isSwitchingThread = threadContext?.isSwitchingThread || false;
  const isLoadingThreads = threadContext?.isLoadingThreads || false;

  // Create thread handler
  const handleCreateThread = async () => {
    try {
      if (threadContext?.createThread) {
        const thread = await threadContext.createThread('New conversation started');
        console.log('Created thread with ID:', thread.id);
      } else {
        console.error('No createThread method available');
      }
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  // Thread selection handler
  const handleThreadSelect = async (threadId: string) => {
    try {
      if (threadContext?.switchThread) {
        await threadContext.switchThread(threadId);
        console.log('Switched to thread:', threadId);
      } else {
        console.error('No switchThread method available');
      }
    } catch (error) {
      console.error('Failed to switch thread:', error);
    }
  };

  // Delete thread handler
  const handleDeleteThread = async (threadId: string) => {
    try {
      if (threadContext?.deleteThread) {
        await threadContext.deleteThread(threadId);
        console.log('Deleted thread:', threadId);
      } else {
        console.error('No deleteThread method available');
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  // Rename thread handler
  const handleRenameThread = async (threadId: string, newTitle: string) => {
    try {
      if (threadContext?.renameThread) {
        await threadContext.renameThread(threadId, newTitle);
        console.log('Renamed thread:', threadId, 'to:', newTitle);
      } else {
        console.error('No renameThread method available');
      }
    } catch (error) {
      console.error('Failed to rename thread:', error);
    }
  };

  // Debug: Check if onSendMessage is in props
  console.log('[CustomThreadedChatWindowWithSettings] onSendMessage exists:', !!props.onSendMessage);
  console.log('[CustomThreadedChatWindowWithSettings] All props:', Object.keys(props));
  console.log('[CustomThreadedChatWindowWithSettings] Props details:', {
    propKeys: Object.keys(props),
    hasMessages: !!props.messages,
    messageCount: props.messages?.length || 0,
    onSendMessage: props.onSendMessage,
    onSendMessageType: typeof props.onSendMessage
  });
  
  // Use messages from context or props
  const displayMessages = messages;
  
  // Create a wrapper for onSendMessage that uses ThreadContext
  const handleSendMessage = useCallback((message: string) => {
    console.log('[CustomThreadedChatWindowWithSettings] handleSendMessage called with:', message);
    
    if (threadContext?.sendText) {
      // Use ThreadContext's sendText which handles everything
      threadContext.sendText(message);
    } else if (props.onSendMessage) {
      // Fallback to props if no thread context
      props.onSendMessage(message);
    } else {
      console.error('[CustomThreadedChatWindowWithSettings] No sendText in context and no onSendMessage prop!');
    }
  }, [threadContext, props.onSendMessage]);
  
  // Don't render until we have the essential props
  if (!props.onSendMessage) {
    console.warn('[CustomThreadedChatWindowWithSettings] Waiting for onSendMessage prop...');
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#666'
      }}>
        Initializing chat interface...
      </div>
    );
  }
  
  return (
    <>
      <ThreadedChatWindow
        // First spread props to get all the base functionality
        {...props}
        // Then override with our thread management specific props
        threads={threads}
        activeThreadId={activeThreadId || undefined}
        onSelectThread={handleThreadSelect}
        onCreateThread={handleCreateThread}
        onDeleteThread={handleDeleteThread}
        onRenameThread={handleRenameThread}
        isCreatingThread={false}
        showThreadList={true}
        threadListPosition="left"
        threadListWidth="320px"
        // Use messages from context
        messages={displayMessages}
        style={{ height: '100%' }}
        // Use our wrapped handler
        onSendMessage={handleSendMessage}
        // Pass loading states
        isLoading={isLoading || isSwitchingThread}
        // Pass streaming states from context
        streamingContent={threadContext?.streamingContent || props.streamingContent}
        streamingContentType={threadContext?.streamingContentType || props.streamingContentType}
        streamingMessageId={threadContext?.streamingMessageId || props.streamingMessageId}
        isStreamingActive={threadContext?.isStreamingActive || props.isStreamingActive}
      />
      
      {/* Custom ThreadList - we'll need to implement this properly */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: isThreadListCollapsed ? '60px' : '320px',
        height: '100%',
        zIndex: 1000,
        transition: 'width 0.3s ease'
      }}>
        <CustomThreadListWithSettings
          threads={threads}
          activeThreadId={activeThreadId || undefined}
          onSelectThread={handleThreadSelect}
          onCreateThread={handleCreateThread}
          onDeleteThread={handleDeleteThread}
          onRenameThread={handleRenameThread}
          isCreatingThread={false}
          isLoading={isLoadingThreads}
          onSettingsClick={() => setIsSettingsOpen(true)}
          onCollapseChange={setIsThreadListCollapsed}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};

// Configuration Provider
const ConfigurationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<ConfigurationState>(() => {
    try {
      const saved = localStorage.getItem('thread-management-demo-config');
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  // Track if configuration has pending changes
  const [pendingConfig, setPendingConfig] = useState<ConfigurationState | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    localStorage.setItem('thread-management-demo-config', JSON.stringify(config));
  }, [config]);

  const updateConfig = useCallback((updates: Partial<ConfigurationState>) => {
    // Update pending config instead of actual config
    setPendingConfig(prev => {
      const current = prev || config;
      return { ...current, ...updates };
    });
  }, [config]);

  const applyConfig = useCallback(() => {
    if (pendingConfig) {
      console.log('🔄 [ThreadManagementDemo] Applying new configuration...');
      console.log('📋 [ThreadManagementDemo] Previous config:', config);
      console.log('✨ [ThreadManagementDemo] New config:', pendingConfig);
      
      // Log specific changes
      if (config.aiProvider.model !== pendingConfig.aiProvider.model) {
        console.log(`🤖 [ThreadManagementDemo] Model change: ${config.aiProvider.model} → ${pendingConfig.aiProvider.model}`);
      }
      if (config.aiProvider.provider !== pendingConfig.aiProvider.provider) {
        console.log(`🏢 [ThreadManagementDemo] Provider change: ${config.aiProvider.provider} → ${pendingConfig.aiProvider.provider}`);
      }
      if (config.voice.enabled !== pendingConfig.voice.enabled) {
        console.log(`🎤 [ThreadManagementDemo] Voice change: ${config.voice.enabled ? 'enabled' : 'disabled'} → ${pendingConfig.voice.enabled ? 'enabled' : 'disabled'}`);
      }
      
      // Apply the pending config
      setConfig(pendingConfig);
      setPendingConfig(null);
      
      // Trigger reconnection
      console.log('🔌 [ThreadManagementDemo] Triggering WebSocket reconnection...');
      setIsReconnecting(true);
      setTimeout(() => {
        setIsReconnecting(false);
        console.log('✅ [ThreadManagementDemo] Reconnection complete, new configuration active');
      }, 100);
    }
  }, [pendingConfig, config]);

  const cancelPendingChanges = useCallback(() => {
    setPendingConfig(null);
  }, []);

  const resetConfig = useCallback(() => {
    setPendingConfig(DEFAULT_CONFIG);
  }, []);

  const exportConfig = useCallback(() => {
    return JSON.stringify(config, null, 2);
  }, [config]);

  const importConfig = useCallback((configString: string) => {
    try {
      const parsed = JSON.parse(configString);
      if (parsed && typeof parsed === 'object' && parsed.aiProvider && parsed.uiFramework) {
        setPendingConfig(parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Check if there are pending changes
  const hasPendingChanges = pendingConfig && JSON.stringify(pendingConfig) !== JSON.stringify(config);

  return (
    <ConfigurationContext.Provider value={{
      config: pendingConfig || config,  // Show pending config in UI
      updateConfig,
      resetConfig,
      exportConfig,
      importConfig,
      applyConfig,
      cancelPendingChanges,
      hasPendingChanges,
      isReconnecting,
      actualConfig: config  // The actually applied config
    }}>
      {children}
    </ConfigurationContext.Provider>
  );
};

// Main Demo Component
const ThreadManagementDemo: React.FC = () => {
  const { actualConfig, isReconnecting } = useContext(ConfigurationContext);
  const config = actualConfig || useContext(ConfigurationContext).config;

  // Log when component re-renders with new config
  useEffect(() => {
    if (actualConfig) {
      console.log('🎯 [ThreadManagementDemo] Component rendered with config:', {
        model: actualConfig.aiProvider.model,
        provider: actualConfig.aiProvider.provider,
        voice: actualConfig.voice.enabled,
        mcpServers: actualConfig.mcpServers.length,
        theme: actualConfig.theme.name
      });
    }
  }, [actualConfig]);

  // Build connection configuration for ConfigurableGeUIClient
  const connectionConfig = useMemo(() => {
    const mcpServers = config.mcpServers
      .filter(server => server.enabled)
      .map(server => ({
        name: server.name,
        url: server.url,
        transport: 'http' as const,
        headers: server.headers || {}
      }));

    const connectionId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`🆔 [ThreadManagementDemo] Creating connection config with ID: ${connectionId}`);
    console.log(`   Model: ${config.aiProvider.model}`);
    console.log(`   Provider: ${config.aiProvider.provider}`);
    console.log(`   Voice: ${config.voice.enabled ? 'enabled' : 'disabled'}`);
    console.log(`   MCP Servers: ${mcpServers.length}`);

    return {
      client_id: 'thread-management-demo',
      connection_instance_id: connectionId, // Track this specific connection
      mcp_config: {
        model: config.aiProvider.model,
        api_key_env: AI_PROVIDERS.find(p => p.id === config.aiProvider.provider)?.apiKeyEnv || 'OPENAI_API_KEY',
        servers: mcpServers
      },
      visualization_provider: config.uiFramework.framework === 'crayon' ? {
        provider_type: 'thesys' as const,
        model: 'c1-nightly',
        api_key_env: 'THESYS_API_KEY'
      } : {
        provider_type: (config.uiFramework.visualizationLLM?.provider || 'openai') as 'thesys' | 'openai' | 'anthropic' | 'google' | 'tomorrow_ai',
        model: config.uiFramework.visualizationLLM?.model || 'gpt-4o-mini',
        api_key_env: config.uiFramework.visualizationLLM?.apiKeyEnv || 'OPENAI_API_KEY'
      }
    };
  }, [config]);

  // Build options for GeUI
  const geuiOptions = useMemo(() => {
    return {
      theme: config.theme.colors,
      crayonTheme: toCrayonTheme(config.theme.colors),
      agentName: `${config.aiProvider.provider.toUpperCase()} Assistant`,
      uiFramework: config.uiFramework.framework === 'crayon' ? undefined : config.uiFramework.framework,
      // Voice settings
      voiceSettings: config.voice,
      // Override ChatWindow with our custom threaded version
      components: {
        ChatWindow: CustomThreadedChatWindowWithSettings
      }
    };
  }, [config]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1000,
      background: config.theme.colors.colors.background
    }}>
      {/* Add CSS animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
      {/* Status Bar */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 1001,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span>🤖 {config.aiProvider.provider.toUpperCase()}</span>
        <span>•</span>
        <span>🎨 {config.uiFramework.framework}</span>
        <span>•</span>
        <span>🔌 {config.mcpServers.filter(s => s.enabled).length} MCP</span>
        <span>•</span>
        <span>{config.voice.enabled ? '🎤 Voice' : '🔇 Text Only'}</span>
      </div>

      {/* Reconnecting Overlay */}
      {isReconnecting && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#1f2937' }}>
              🔄 Applying Configuration
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#6b7280' }}>
              Reconnecting with new settings...
            </p>
            <div style={{
              width: '48px',
              height: '48px',
              margin: '0 auto',
              border: '4px solid #e5e7eb',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        </div>
      )}

      {/* Main ConfigurableGeUIClient Component */}
      {!isReconnecting && (
        <ConfigurableGeUIClient
          key={JSON.stringify(connectionConfig)} // Force remount on config change
          clientId="thread-management-demo"
          connectionConfig={connectionConfig}
          bubbleEnabled={false}
          disableVoice={!config.voice.enabled}  // Voice controlled by settings
          enableThreadManagement={true}  // Enable thread management functionality
          options={{
            ...geuiOptions,
            threadManager: {
              enablePersistence: true,
              maxThreads: 20,
              autoGenerateTitles: true,
              showCreateButton: true,
              allowThreadDeletion: true
            }
          }}
        />
      )}
    </div>
  );
};

// Wrapped Demo with Configuration Provider
const ThreadManagementDemoWithProvider: React.FC = () => {
  return (
    <ConfigurationProvider>
      <ThreadManagementDemo />
    </ConfigurationProvider>
  );
};

export default ThreadManagementDemoWithProvider;