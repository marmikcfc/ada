import React from 'react';
import DOMPurify from 'dompurify';
import { C1Component } from '@thesysai/genui-sdk';
import { ThemeProvider } from '@crayonai/react-ui';

export interface FlexibleContentRendererProps {
  content?: string;
  c1Content?: string;
  htmlContent?: string;
  reactContent?: React.ReactNode;
  contentType?: 'auto' | 'c1' | 'html' | 'react' | 'text';
  onC1Action?: (action: any) => void;
  sendC1Action?: (action: { llmFriendlyMessage: string, humanFriendlyMessage: string }) => void;
  isStreaming?: boolean;
  crayonTheme?: Record<string, any>;
  allowDangerousHtml?: boolean;
  htmlSanitizeOptions?: {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedStyles?: string[];
  };
}

/**
 * Flexible content renderer that supports multiple content formats:
 * - C1Component XML content
 * - Raw HTML (with optional sanitization)
 * - React components
 * - Plain text
 */
export const FlexibleContentRenderer: React.FC<FlexibleContentRendererProps> = ({
  content,
  c1Content,
  htmlContent,
  reactContent,
  contentType = 'auto',
  onC1Action,
  sendC1Action,
  isStreaming = false,
  crayonTheme = {},
  allowDangerousHtml = false,
  htmlSanitizeOptions = {}
}) => {
  // Auto-detect content type if not specified
  const detectContentType = (): 'c1' | 'html' | 'react' | 'text' => {
    if (contentType !== 'auto') return contentType;
    
    // Priority order: React > C1 > HTML > Text
    if (reactContent) return 'react';
    if (c1Content) return 'c1';
    if (htmlContent) return 'html';
    
    // Check if content contains C1 markers (even if streaming and incomplete)
    if (content && content.includes('<content>')) {
      return 'c1';
    }
    
    // Check if content looks like HTML
    if (content && /<[a-zA-Z][\s\S]*>/i.test(content)) {
      return 'html';
    }
    
    return 'text';
  };

  const detectedType = detectContentType();

  // Extract C1 content from wrapped format
  const extractC1Content = (rawContent: string): string => {
    // First try to match complete content tags
    const completeMatch = rawContent.match(/<content>([\s\S]*?)<\/content>/);
    if (completeMatch) {
      return completeMatch[1];
    }
    
    // For streaming content, extract partial content if <content> tag is present
    const partialMatch = rawContent.match(/<content>([\s\S]*)/);
    if (partialMatch) {
      return partialMatch[1];
    }
    
    // Fallback to original content
    return rawContent;
  };

  // HTML sanitization using DOMPurify
  const sanitizeHtml = (html: string): string => {
    if (allowDangerousHtml) return html;
    
    const defaultAllowedTags = ['p', 'div', 'span', 'a', 'b', 'i', 'u', 'strong', 'em', 
                               'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
                               'table', 'thead', 'tbody', 'tr', 'td', 'th', 'br', 'hr',
                               'code', 'pre', 'blockquote', 'img', 'button', 'form',
                               'input', 'label', 'select', 'option', 'textarea'];
    
    const defaultAllowedAttributes = {
      'a': ['href', 'title', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height'],
      'button': ['type', 'onclick', 'onmouseover', 'onmouseout', 'class', 'id', 'data-action', 'data-context', 'data-trigger'],
      'input': ['type', 'name', 'value', 'placeholder', 'class', 'id', 'onchange', 'oninput', 'onfocus', 'onblur', 'data-action', 'data-trigger', 'data-debounce'],
      'form': ['action', 'method', 'class', 'id', 'onsubmit'],
      'select': ['name', 'class', 'id', 'onchange', 'onfocus', 'onblur', 'data-action'],
      'option': ['value', 'selected'],
      'textarea': ['name', 'class', 'id', 'placeholder', 'onchange', 'oninput', 'onfocus', 'onblur', 'data-action', 'data-trigger', 'data-debounce'],
      'div': ['class', 'id', 'style', 'onclick', 'onmouseover', 'onmouseout', 'data-chakra-component'],
      'label': ['class', 'id', 'for', 'data-chakra-component'],
      '*': ['class', 'id', 'style']
    };
    
    // Build allowed attributes list correctly
    const allowedAttributes = new Set<string>();
    Object.values(htmlSanitizeOptions.allowedAttributes || defaultAllowedAttributes).forEach(attrs => {
      attrs.forEach(attr => allowedAttributes.add(attr));
    });
    
    const config: DOMPurify.Config = {
      ALLOWED_TAGS: htmlSanitizeOptions.allowedTags || defaultAllowedTags,
      ALLOWED_ATTR: Array.from(allowedAttributes),
      ALLOW_DATA_ATTR: true, // Allow data-* attributes for framework interaction
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SAFE_FOR_TEMPLATES: true,
      WHOLE_DOCUMENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      FORCE_BODY: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
      // Critical: Allow JavaScript event handlers for interactions
      FORBID_ATTR: [], // Don't forbid any attributes by default
      FORBID_TAGS: [], // Don't forbid any tags by default
    };
    
    // Add hook to allow JavaScript event handlers - scoped to this call only
    DOMPurify.addHook('uponSanitizeAttribute', function (_node, data) {
      // Allow onclick, onsubmit, onchange, etc. event handlers
      if (data.attrName && data.attrName.startsWith('on')) {
        console.log(`DOMPurify: Processing ${data.attrName}="${data.attrValue}"`);
        // Only allow event handlers that call window.geuiSDK methods
        if (data.attrValue && data.attrValue.includes('window.geuiSDK')) {
          console.log(`DOMPurify: Allowing ${data.attrName} with window.geuiSDK`);
          return; // Allow this attribute
        }
        // Remove other JavaScript event handlers for security
        console.log(`DOMPurify: Removing ${data.attrName} (no window.geuiSDK)`);
        data.keepAttr = false;
      }
    });
    
    const result = DOMPurify.sanitize(html, config);
    
    // Clean up the hook immediately after use to prevent interference with other components
    DOMPurify.removeHook('uponSanitizeAttribute');
    
    return result;
  };

  // Render based on detected or specified type
  switch (detectedType) {
    case 'react':
      return <>{reactContent}</>;
      
    case 'c1':
      const c1Xml = c1Content || (content ? extractC1Content(content) : '');
      
      // Create C1 action handler that sends to backend
      const c1ActionHandler = (action: any) => {
        console.log('C1Component action:', action);
        
        // First, try the custom onC1Action if provided
        if (onC1Action) {
          onC1Action(action);
        }
        
        // If we have sendC1Action and llmFriendlyMessage, send to backend
        if (sendC1Action && action.llmFriendlyMessage) {
          try {
            sendC1Action({ 
              llmFriendlyMessage: action.llmFriendlyMessage,
              humanFriendlyMessage: action.humanFriendlyMessage || action.llmFriendlyMessage
            });
          } catch (error) {
            console.error('Failed to send C1Action to backend:', error);
          }
        }
      };
      
      return (
        <ThemeProvider theme={crayonTheme || {}}>
          <C1Component
            c1Response={c1Xml}
            onAction={c1ActionHandler}
            isStreaming={isStreaming}
          />
        </ThemeProvider>
      );
      
    case 'html':
      const html = htmlContent || content || '';
      console.log('FlexibleContentRenderer: Original HTML:', html);
      const processedHtml = sanitizeHtml(html);
      console.log('FlexibleContentRenderer: Processed HTML:', processedHtml);
      console.log('FlexibleContentRenderer: window.geuiSDK available:', !!(window as any).geuiSDK);
      
      return (
        <div 
          className="geui-html-content geui-framework-content"
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      );
      
    case 'text':
    default:
      return <div className="geui-text-content">{content}</div>;
  }
};

// Export a simpler version for backward compatibility
export const ContentRenderer: React.FC<{
  content?: string;
  onC1Action?: (action: any) => void;
  isStreaming?: boolean;
  crayonTheme?: Record<string, any>;
}> = ({ content, onC1Action, isStreaming, crayonTheme }) => {
  return (
    <FlexibleContentRenderer
      content={content}
      contentType="auto"
      onC1Action={onC1Action}
      isStreaming={isStreaming}
      crayonTheme={crayonTheme}
    />
  );
};