import React from 'react';
import DOMPurify from 'dompurify';
import { C1Component } from '@thesysai/genui-sdk';
import { ThemeProvider } from '@crayonai/react-ui';

export interface FlexibleContentRendererProps {
  /** Primary content - contains C1Component JSON, HTML, or plain text */
  content: string;
  /** Content type - determines how content should be rendered */
  contentType: 'c1' | 'html' | 'react' | 'text';
  /** React component/node for custom rendering (only used when contentType is 'react') */
  reactContent?: React.ReactNode;
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
  contentType,
  reactContent,
  onC1Action,
  sendC1Action,
  isStreaming = false,
  crayonTheme = {},
  allowDangerousHtml = false,
  htmlSanitizeOptions = {}
}) => {
  // Use the explicit contentType directly - no auto-detection needed
  const detectedType = contentType;

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
      'input': ['type', 'name', 'value', 'placeholder', 'class', 'id', 'onchange', 'oninput', 'onfocus', 'onblur', 'data-action', 'data-trigger', 'data-debounce', 'required'],
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
      ADD_ATTR: ['onsubmit', 'onclick', 'onchange', 'oninput', 'onfocus', 'onblur'], // Explicitly add event attributes
    };
    
    // Add hook to allow JavaScript event handlers - scoped to this call only
    DOMPurify.addHook('uponSanitizeAttribute', function (_node, data) {
      // Allow onclick, onsubmit, onchange, etc. event handlers
      if (data.attrName && data.attrName.startsWith('on')) {
        console.log(`DOMPurify: Processing ${data.attrName}="${data.attrValue}"`);
        // Only allow event handlers that call window.geuiSDK methods
        if (data.attrValue && data.attrValue.includes('window.geuiSDK')) {
          console.log(`DOMPurify: Allowing ${data.attrName} with window.geuiSDK`);
          // Explicitly keep the attribute to prevent modification
          data.keepAttr = true;
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
      const c1Xml = extractC1Content(content || '');
      
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
      const html = content || '';
      console.log('🔍 FlexibleContentRenderer DEBUG: Original HTML:', html);
      
      // Check for event handlers in original HTML
      const onsubmitMatch = html.match(/onsubmit="([^"]*)"/);
      const onclickMatch = html.match(/onclick="([^"]*)"/);
      const onchangeMatch = html.match(/onchange="([^"]*)"/);
      
      if (onsubmitMatch) {
        console.log('🔍 Found onsubmit attribute:', onsubmitMatch[1]);
      }
      if (onclickMatch) {
        console.log('🔍 Found onclick attribute:', onclickMatch[1]);
      }
      if (onchangeMatch) {
        console.log('🔍 Found onchange attribute:', onchangeMatch[1]);
      }
      
      const processedHtml = sanitizeHtml(html);
      console.log('🔍 FlexibleContentRenderer DEBUG: Processed HTML:', processedHtml);
      
      // Check if event handlers were preserved
      const processedOnsubmitMatch = processedHtml.match(/onsubmit="([^"]*)"/);
      const processedOnclickMatch = processedHtml.match(/onclick="([^"]*)"/);
      const processedOnchangeMatch = processedHtml.match(/onchange="([^"]*)"/);
      
      if (processedOnsubmitMatch) {
        console.log('✅ Preserved onsubmit attribute:', processedOnsubmitMatch[1]);
        
        // Test if the JavaScript would execute
        try {
          const testResult = eval(`typeof window.geuiSDK !== 'undefined' && typeof window.geuiSDK.handleFormSubmit === 'function'`);
          console.log('🔍 Can execute window.geuiSDK.handleFormSubmit?', testResult);
        } catch (e) {
          console.error('❌ Error testing onsubmit execution:', e);
        }
      } else if (onsubmitMatch) {
        console.error('❌ onsubmit attribute was REMOVED during sanitization!');
      }
      
      if (processedOnclickMatch) {
        console.log('✅ Preserved onclick attribute:', processedOnclickMatch[1]);
      } else if (onclickMatch) {
        console.error('❌ onclick attribute was REMOVED during sanitization!');
      }
      
      if (processedOnchangeMatch) {
        console.log('✅ Preserved onchange attribute:', processedOnchangeMatch[1]);
      } else if (onchangeMatch) {
        console.error('❌ onchange attribute was REMOVED during sanitization!');
      }
      
      console.log('🔍 window.geuiSDK available:', !!(window as any).geuiSDK);
      console.log('🔍 window.geuiSDK methods:', (window as any).geuiSDK ? Object.keys((window as any).geuiSDK) : 'N/A');
      
      const containerRef = React.useRef<HTMLDivElement>(null);
      
      // Event delegation for form submissions
      React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const handleSubmit = (e: Event) => {
          console.log('🚀 Event delegation: Form submit intercepted', e.target);
          
          if (e.target instanceof HTMLFormElement) {
            e.preventDefault(); // Always prevent default first
            
            const form = e.target;
            const formData = new FormData(form);
            
            // Extract form ID from onsubmit attribute or data attributes
            let formId = form.dataset.geuiForm || form.id || 'unknown-form';
            
            // If no data attribute, try to extract from onsubmit
            const onsubmitAttr = form.getAttribute('onsubmit');
            if (onsubmitAttr && !form.dataset.geuiForm) {
              const match = onsubmitAttr.match(/handleFormSubmit\([^,]+,\s*['"]([^'"]+)['"]\)/);
              if (match) {
                formId = match[1];
              }
            }
            
            console.log('🚀 Form submission delegated:', { formId, formData });
            
            // Call the global handler if available
            const geuiSDK = (window as any).geuiSDK;
            if (geuiSDK && typeof geuiSDK.handleFormSubmit === 'function') {
              geuiSDK.handleFormSubmit(e, formId);
            } else {
              console.error('❌ window.geuiSDK.handleFormSubmit not available');
            }
          }
        };
        
        const handleClick = (e: Event) => {
          if (e.target instanceof HTMLButtonElement) {
            const button = e.target;
            
            // Check if this is a form submit button
            if (button.type === 'submit') {
              console.log('🚀 Event delegation: Submit button clicked', button);
              // Let the form submit handler deal with it
              return;
            }
            
            // Handle other button clicks
            const onclickAttr = button.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes('window.geuiSDK')) {
              e.preventDefault();
              
              console.log('🚀 Button click delegated:', onclickAttr);
              
              // Extract action and context from onclick
              const geuiSDK = (window as any).geuiSDK;
              if (geuiSDK && typeof geuiSDK.handleButtonClick === 'function') {
                // Try to extract parameters from onclick attribute
                const match = onclickAttr.match(/handleButtonClick\([^,]+,\s*['"]([^'"]+)['"],\s*({[^}]*}|\S+)\)/);
                if (match) {
                  const actionType = match[1];
                  let context;
                  try {
                    context = JSON.parse(match[2]);
                  } catch {
                    context = { raw: match[2] };
                  }
                  geuiSDK.handleButtonClick(e, actionType, context);
                }
              }
            }
          }
        };
        
        const handleChange = (e: Event) => {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
            const element = e.target;
            const onchangeAttr = element.getAttribute('onchange');
            
            if (onchangeAttr && onchangeAttr.includes('window.geuiSDK')) {
              console.log('🚀 Input change delegated:', { name: element.name, value: element.value });
              
              const geuiSDK = (window as any).geuiSDK;
              if (geuiSDK && typeof geuiSDK.handleInputChange === 'function') {
                // Extract field name from onchange attribute
                const match = onchangeAttr.match(/handleInputChange\([^,]+,\s*['"]([^'"]+)['"]\)/);
                const fieldName = match ? match[1] : (element.name || element.id || 'unknown-field');
                geuiSDK.handleInputChange(e, fieldName);
              }
            }
          }
        };
        
        // Add event listeners with capture to intercept before default handling
        container.addEventListener('submit', handleSubmit, true);
        container.addEventListener('click', handleClick, true);
        container.addEventListener('change', handleChange, false);
        
        console.log('🚀 Event delegation listeners added to container');
        
        return () => {
          container.removeEventListener('submit', handleSubmit, true);
          container.removeEventListener('click', handleClick, true);
          container.removeEventListener('change', handleChange, false);
          console.log('🚀 Event delegation listeners removed');
        };
      }, [processedHtml]);
      
      // Add debugging after render to check actual DOM
      React.useEffect(() => {
        if (containerRef.current) {
          const forms = containerRef.current.querySelectorAll('form');
          console.log('🔍 Forms found in DOM:', forms.length);
          
          forms.forEach((form, index) => {
            console.log(`🔍 Form ${index}:`, {
              onsubmit: form.getAttribute('onsubmit'),
              hasOnsubmitProperty: 'onsubmit' in form,
              onsubmitFunction: typeof (form as any).onsubmit,
              formHTML: form.outerHTML.substring(0, 200) + '...'
            });
            
            // Test if the form would actually prevent default
            const testSubmitEvent = new Event('submit', { bubbles: true, cancelable: true });
            console.log('🔍 Testing form submission event handling...');
            
            const originalPreventDefault = testSubmitEvent.preventDefault;
            let preventDefaultCalled = false;
            testSubmitEvent.preventDefault = function() {
              preventDefaultCalled = true;
              console.log('✅ preventDefault() was called!');
              return originalPreventDefault.call(this);
            };
            
            // Don't actually dispatch - just test the handler exists
            const onsubmitAttr = form.getAttribute('onsubmit');
            if (onsubmitAttr) {
              console.log('🔍 Would execute:', onsubmitAttr);
              try {
                // Create a test environment
                const testFn = new Function('event', onsubmitAttr);
                console.log('✅ onsubmit compiles as valid JavaScript');
              } catch (e) {
                console.error('❌ onsubmit is invalid JavaScript:', e);
              }
            }
          });
        }
      }, [processedHtml]);
      
      return (
        <div 
          ref={containerRef}
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
  // Auto-detect content type for backward compatibility
  const detectLegacyContentType = (): 'c1' | 'html' | 'text' => {
    if (!content) return 'text';
    if (content.includes('<content>')) return 'c1';
    if (/<[a-zA-Z][\s\S]*>/i.test(content)) return 'html';
    return 'text';
  };
  
  return (
    <FlexibleContentRenderer
      content={content || ''}
      contentType={detectLegacyContentType()}
      onC1Action={onC1Action}
      isStreaming={isStreaming}
      crayonTheme={crayonTheme}
    />
  );
};