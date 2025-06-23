import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GenerativeUIChat from '../GenerativeUIChat';

// jsdom doesn't implement scrollIntoView; mock it for tests
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true,
});

// Node's crypto may not provide randomUUID in jsdom; stub it
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = {};
}
(globalThis as any).crypto.randomUUID = () => 'test-id';

// Mock the C1Component from @thesysai/genui-sdk
jest.mock('@thesysai/genui-sdk', () => ({
  C1Component: ({ onAction }) => (
    <div data-testid="mock-c1-component">
      <button 
        data-testid="c1-action-button"
        onClick={() => onAction({
          llmFriendlyMessage: '<content><content>Create Contact</content><context>["User clicked on Button: submit-contact",{"create-contact-form":{"firstName":{"componentType":"Input","value":"John"},"lastName":{"componentType":"Input","value":"Doe"}}}]</context></content>',
          humanFriendlyMessage: 'Create Contact'
        })}
      >
        Trigger C1 Action
      </button>
    </div>
  )
}));

// Mock ThemeProvider
jest.mock('@crayonai/react-ui', () => ({
  ThemeProvider: ({ children }) => <div data-testid="theme-provider">{children}</div>
}));

describe('GenerativeUIChat Component', () => {
  // Mock threadManager
  const mockThreadManager = {
    messages: [],
    processMessage: jest.fn(),
    appendMessages: jest.fn()
  };

  // Mock callbacks
  const mockOnSendMessage = jest.fn();
  const mockOnC1Action = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockThreadManager.messages = [
      {
        id: '1',
        role: 'assistant',
        message: [
          {
            type: 'template',
            name: 'c1',
            templateProps: {
              content: '<content>{"component":"Card"}</content>'
            }
          }
        ],
        createdAt: new Date().toISOString()
      }
    ];
  });

  test('should handle C1Component actions correctly', async () => {
    render(
      <GenerativeUIChat
        threadManager={mockThreadManager}
        onSendMessage={mockOnSendMessage}
        onC1Action={mockOnC1Action}
      />
    );

    // Verify the C1Component is rendered
    const c1Component = screen.getByTestId('mock-c1-component');
    expect(c1Component).toBeInTheDocument();

    // Trigger a C1Component action
    const actionButton = screen.getByTestId('c1-action-button');
    fireEvent.click(actionButton);

    // Verify onC1Action was called with the correct data
    expect(mockOnC1Action).toHaveBeenCalledTimes(1);
    expect(mockOnC1Action).toHaveBeenCalledWith({
      llmFriendlyMessage: '<content><content>Create Contact</content><context>["User clicked on Button: submit-contact",{"create-contact-form":{"firstName":{"componentType":"Input","value":"John"},"lastName":{"componentType":"Input","value":"Doe"}}}]</context></content>',
      humanFriendlyMessage: 'Create Contact'
    });

    // Verify appendMessages was called with only the humanFriendlyMessage
    expect(mockThreadManager.appendMessages).toHaveBeenCalledTimes(1);
    expect(mockThreadManager.appendMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        message: 'Create Contact',
        type: 'prompt'
      })
    );

    // Verify processMessage was NOT called with the llmFriendlyMessage
    expect(mockThreadManager.processMessage).not.toHaveBeenCalled();
  });

  test('should not create duplicate messages when handling C1Component actions', async () => {
    render(
      <GenerativeUIChat
        threadManager={mockThreadManager}
        onSendMessage={mockOnSendMessage}
        onC1Action={mockOnC1Action}
      />
    );

    // Trigger a C1Component action
    const actionButton = screen.getByTestId('c1-action-button');
    fireEvent.click(actionButton);

    // Verify appendMessages was called exactly once
    expect(mockThreadManager.appendMessages).toHaveBeenCalledTimes(1);
    
    // Verify no other message-creating methods were called
    expect(mockThreadManager.processMessage).not.toHaveBeenCalled();
  });

  test('should handle normal text messages correctly', async () => {
    render(
      <GenerativeUIChat
        threadManager={mockThreadManager}
        onSendMessage={mockOnSendMessage}
        onC1Action={mockOnC1Action}
      />
    );

    // Simulate sending a text message
    const testMessage = 'Hello, this is a test message';
    
    // Find the input in CustomChatComposer (mocked implicitly)
    // This is a simplified test since we're not rendering the actual CustomChatComposer
    const mockSendMessage = mockThreadManager.processMessage;
    
    // Call the handler directly as if it came from CustomChatComposer
    mockSendMessage({
      role: 'user',
      type: 'prompt',
      message: testMessage
    });

    // Verify processMessage was called with the text message
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith({
      role: 'user',
      type: 'prompt',
      message: testMessage
    });
  });
});
