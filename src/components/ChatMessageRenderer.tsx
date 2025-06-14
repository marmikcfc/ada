import React from 'react';
import { C1Component } from '@thesysai/genui-sdk'; // Assuming C1Component is available here
import { TextContent } from '@crayonai/react-ui'; // For plain text rendering

// Define a more specific type for your message structure if possible
// This is a general example based on typical chat message structures
interface Message {
  id: string;
  role: 'user' | 'assistant';
  // Assuming Thesys/C1 messages are nested like this based on VoiceBotClient.tsx
  message?: Array<{
    type?: 'template' | string; // 'template' for C1, or other types for plain text
    name?: 'c1' | string;
    templateProps?: {
      content: string;
    };
    // For plain text user messages or simple assistant messages
    text?: string; 
  }>;
  // Fallback for direct text content in message object (user transcriptions often are like this)
  content?: string; 
}

interface ChatMessageRendererProps {
  message: Message;
  // Callbacks for C1Component interactions
  onC1Action: (action: any) => void; 
  onC1UpdateMessage: (updatedC1Response: string, messageId: string) => void;
  isMessageStreaming?: boolean; // To indicate if this specific message is streaming
}

const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({
  message,
  onC1Action,
  onC1UpdateMessage,
  isMessageStreaming,
}) => {
  const isAssistant = message.role === 'assistant';

  // Determine if it's a C1 dynamic UI message
  const c1MessageData = 
    isAssistant && 
    message.message && 
    message.message[0]?.type === 'template' && 
    message.message[0]?.name === 'c1' && 
    message.message[0]?.templateProps?.content;

  const handleUpdateMessage = (updatedContent: string) => {
    onC1UpdateMessage(updatedContent, message.id);
  };

  if (c1MessageData) {
    // Render C1Component for dynamic UI
    return (
      <div className={`message c1-dynamic-message ${isAssistant ? 'assistant' : 'user'}`}>
        <C1Component
          c1Response={c1MessageData}
          onAction={onC1Action}
          updateMessage={handleUpdateMessage} // Pass the wrapped updater
          isStreaming={isMessageStreaming || false} 
          // searchImage can be added if needed: searchImage={(query) => Promise.resolve({ url: '', thumbnailUrl: '' })}
        />
      </div>
    );
  } else {
    // Render plain text message (user or simple assistant text)
    let textToShow = '';
    if (message.content) { // Primarily for user transcriptions or simple messages
      textToShow = message.content;
    } else if (message.message && message.message[0]?.text) { // For structured text messages
      textToShow = message.message[0].text;
    } else if (typeof message.message === 'string') { // Fallback if message is just a string
        textToShow = message.message;
    }


    return (
      <div className={`message plain-text-message ${isAssistant ? 'assistant' : 'user'}`}>
        {/* Basic styling for message bubbles - can be enhanced with Crayon UI components */}
        <div style={{
          padding: '8px 12px',
          borderRadius: '18px',
          maxWidth: '70%',
          wordWrap: 'break-word',
          backgroundColor: isAssistant ? '#f0f0f0' : '#007bff',
          color: isAssistant ? '#000' : '#fff',
          alignSelf: isAssistant ? 'flex-start' : 'flex-end',
          marginLeft: isAssistant ? '0' : 'auto',
          marginRight: isAssistant ? 'auto' : '0',
        }}>
          <TextContent>{textToShow}</TextContent>
        </div>
      </div>
    );
  }
};

export default ChatMessageRenderer; 