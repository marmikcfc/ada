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
    
    // Check if content contains C1 markers
    if (content && content.includes('<content>') && content.includes('</content>')) {
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
    const match = rawContent.match(/<content>([\s\S]*?)<\/content>/);
    return match ? match[1] : rawContent;
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
      'button': ['type', 'onclick', 'class', 'id'],
      'input': ['type', 'name', 'value', 'placeholder', 'class', 'id'],
      'form': ['action', 'method', 'class', 'id'],
      '*': ['class', 'id', 'style']
    };
    
    const config: DOMPurify.Config = {
      ALLOWED_TAGS: htmlSanitizeOptions.allowedTags || defaultAllowedTags,
      ALLOWED_ATTR: Object.keys(htmlSanitizeOptions.allowedAttributes || defaultAllowedAttributes)
        .reduce((acc, tag) => {
          const attrs = (htmlSanitizeOptions.allowedAttributes || defaultAllowedAttributes)[tag as keyof typeof defaultAllowedAttributes] || [];
          attrs.forEach((attr: string) => acc.push(attr));
          return acc;
        }, [] as string[]),
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SAFE_FOR_TEMPLATES: true,
      WHOLE_DOCUMENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      FORCE_BODY: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
    };
    
    return DOMPurify.sanitize(html, config);
  };

  // Render based on detected or specified type
  switch (detectedType) {
    case 'react':
      return <>{reactContent}</>;
      
    case 'c1':
      const c1Xml = c1Content || (content ? extractC1Content(content) : '');
      return (
        <ThemeProvider theme={crayonTheme}>
          <C1Component
            c1Response={c1Xml}
            onAction={onC1Action}
            isStreaming={isStreaming}
          />
        </ThemeProvider>
      );
      
    case 'html':
      const html = htmlContent || content || '';
      const processedHtml = sanitizeHtml(html);
      
      return (
        <div 
          className="genux-html-content"
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      );
      
    case 'text':
    default:
      return <div className="genux-text-content">{content}</div>;
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