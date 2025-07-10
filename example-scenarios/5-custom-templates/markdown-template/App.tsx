import React, { useState, useEffect, useRef } from 'react';
import { useGenuxCore, GenuxCore, Message } from 'genux-sdk';
import './App.css';

/**
 * Example 5b: Custom Template Rendering - Markdown
 * 
 * This demonstrates how to use Genux SDK with your own markdown renderer
 * instead of using the default C1Component rendering.
 * 
 * Features:
 * - Custom markdown rendering
 * - Syntax highlighting for code blocks
 * - Complete bypass of C1Component
 * - Full control over styling and layout
 */
function App() {
  const [query, setQuery] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [renderedContent, setRenderedContent] = useState<React.ReactNode>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Get core functionality from the hook
  const {
    // State
    messages,
    isLoading,
    streamingContent,
    
    // Actions
    sendText,
    
    // Raw response access
    getRawResponse,
  } = useGenuxCore({
    webrtcURL: '/api/webrtc',
    websocketURL: '/api/ws',
    // Disable C1Component rendering - we'll handle markdown ourselves
    disableC1Rendering: true,
  });
  
  // Detect and extract markdown content from messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        // Extract raw content - this could be markdown
        const rawContent = lastMessage.content || '';
        setMarkdownContent(rawContent);
        
        // In a real implementation, you would render markdown here
        // For demonstration, we'll simulate a markdown renderer
        simulateMarkdownRenderer(rawContent);
      }
    }
  }, [messages]);
  
  // Update with streaming content if available
  useEffect(() => {
    if (streamingContent) {
      setMarkdownContent(streamingContent);
      simulateMarkdownRenderer(streamingContent);
    }
  }, [streamingContent]);
  
  // Simulate a markdown renderer (in a real app, use a library like react-markdown)
  const simulateMarkdownRenderer = (markdown: string) => {
    // This is a simplified simulation of markdown rendering
    // In a real app, you would use a proper markdown library
    
    // Process headings
    let processed = markdown.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    processed = processed.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    processed = processed.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Process bold and italic
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Process code blocks
    processed = processed.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, language, code) => {
      return `<pre class="code-block ${language}"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    });
    
    // Process inline code
    processed = processed.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Process lists
    processed = processed.replace(/^\* (.*$)/gm, '<li>$1</li>');
    processed = processed.replace(/<li>(.*)<\/li>/gm, (match, content) => {
      return `<ul>${match}</ul>`;
    });
    
    // Process numbered lists
    processed = processed.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
    processed = processed.replace(/<li>(.*)<\/li>/gm, (match, content) => {
      return `<ol>${match}</ol>`;
    });
    
    // Process links
    processed = processed.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    
    // Process paragraphs
    processed = processed.replace(/^\s*$/gm, '</p><p>');
    processed = `<p>${processed}</p>`;
    processed = processed.replace(/<p><\/p>/g, '');
    
    // Set the processed HTML
    setRenderedContent(<div className="markdown-content" dangerouslySetInnerHTML={{ __html: processed }} />);
  };
  
  // Handle query submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      // Send a special command to indicate we want markdown response
      sendText(`[FORMAT:markdown] ${query}`);
      setQuery('');
    }
  };
  
  // Auto-scroll to bottom when content changes
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [renderedContent, streamingContent]);
  
  return (
    <div className="app">
      <header className="app-header">
        <h1>Genux SDK - Custom Markdown Renderer</h1>
        <p>
          This example shows how to use your own markdown renderer instead of C1Component
          for rendering documentation, articles, and other text-heavy content.
        </p>
      </header>
      
      <main className="app-content">
        {/* Markdown display area */}
        <div className="markdown-container">
          <div className="markdown-header">
            <h2>Markdown Output</h2>
            <button 
              className="copy-button"
              onClick={() => navigator.clipboard.writeText(markdownContent)}
              disabled={!markdownContent}
            >
              Copy Markdown
            </button>
          </div>
          
          <div className="markdown-display">
            {renderedContent ? (
              renderedContent
            ) : (
              <div className="empty-markdown">
                <p>Submit a query to see markdown content.</p>
                <p className="markdown-examples">Try: "explain React hooks", "tutorial on CSS Grid", "JavaScript promises guide"</p>
              </div>
            )}
            
            {isLoading && !streamingContent && (
              <div className="loading-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
            
            <div ref={messageEndRef} />
          </div>
        </div>
        
        {/* Query input form */}
        <form className="markdown-query-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="markdown-query-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask for documentation, tutorials, guides (e.g., 'explain async/await')"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="markdown-query-button"
            disabled={!query.trim() || isLoading}
          >
            {isLoading ? 'Processing...' : 'Generate Markdown'}
          </button>
        </form>
        
        {/* Raw markdown display for reference */}
        {markdownContent && (
          <div className="raw-markdown">
            <h3>Raw Markdown</h3>
            <pre className="raw-markdown-content">
              {markdownContent}
            </pre>
          </div>
        )}
        
        <div className="info-card">
          <h2>Integration Code</h2>
          <pre className="code-block">
            {`import { useGenuxCore } from 'genux-sdk';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';

// 1. Use Genux hook with C1 rendering disabled
const {
  messages,
  isLoading,
  streamingContent,
  sendText
} = useGenuxCore({
  webrtcURL: '/api/webrtc',
  websocketURL: '/api/ws',
  disableC1Rendering: true, // Important: disable C1Component
});

// 2. Extract markdown content from messages
useEffect(() => {
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant') {
      setMarkdownContent(lastMessage.content || '');
    }
  }
}, [messages]);

// 3. Render markdown with your preferred library
return (
  <div className="markdown-container">
    <ReactMarkdown
      children={markdownContent}
      components={{
        // Custom component for code blocks with syntax highlighting
        code({node, inline, className, children, ...props}) {
          const match = /language-(\\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              children={String(children).replace(/\\n$/, '')}
              style={dracula}
              language={match[1]}
              PreTag="div"
              {...props}
            />
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
      }}
    />
  </div>
);`}
          </pre>
        </div>
        
        <div className="info-card">
          <h2>How It Works</h2>
          <ol className="explanation-list">
            <li>
              <strong>Disable C1 Rendering:</strong> Set <code>disableC1Rendering: true</code> to get raw markdown
            </li>
            <li>
              <strong>Request Markdown:</strong> Send message with <code>[FORMAT:markdown]</code> prefix
            </li>
            <li>
              <strong>Extract Content:</strong> Get raw markdown from assistant messages
            </li>
            <li>
              <strong>Custom Rendering:</strong> Use any markdown library (react-markdown, marked, showdown, etc.)
            </li>
            <li>
              <strong>Styling Control:</strong> Apply your own CSS to the rendered markdown
            </li>
          </ol>
          <p className="note">
            <strong>Note:</strong> This approach gives you complete control over markdown rendering,
            perfect for documentation sites, knowledge bases, and tutorial platforms.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
