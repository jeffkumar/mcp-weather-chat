import React, { useEffect, useState } from 'react';

// Typing effect hook
function useTypingEffect(fullText, speed = 20) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    if (!fullText) return;

    let interval = setInterval(() => {
      setDisplayed(prev => {
        if (prev.length < fullText.length) {
          return fullText.slice(0, prev.length + 1);
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, speed);

    return () => clearInterval(interval);
  }, [fullText, speed]);

  return displayed;
}

const MessageList = ({ messages, isLoading, messagesEndRef }) => {
  const formatMessageContent = (content) => {
    // Convert markdown-style formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  // Find the latest assistant message index
  const lastAssistantIdx = [...messages].reverse().findIndex(m => m.type === 'assistant');
  const lastAssistantAbsIdx = lastAssistantIdx === -1 ? -1 : messages.length - 1 - lastAssistantIdx;

  // Get the animated text for the latest assistant message (if any)
  const animatedText = useTypingEffect(
    lastAssistantAbsIdx !== -1 && messages[lastAssistantAbsIdx]
      ? messages[lastAssistantAbsIdx].content
      : '',
    18
  );

  return (
    <div className="flex-1 overflow-y-auto chat-scroll" style={{ backgroundColor: 'white' }}>
      <div className="max-w-4xl mx-auto">
        {messages.map((message, idx) => {
          let contentToShow = message.content;
          // Only animate the latest assistant message
          if (message.type === 'assistant' && idx === lastAssistantAbsIdx) {
            contentToShow = animatedText;
          }
          return (
            <div
              key={message.id}
              style={{
                padding: '24px 16px',
                borderBottom: 'none'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                maxWidth: '768px',
                margin: '0 auto'
              }}>
                {/* Clean avatar */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: message.type === 'user' ? '#10a37f' : '#6366f1',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600',
                  flexShrink: 0
                }}>
                  {message.type === 'user' ? 'U' : 'AI'}
                </div>

                {/* Message content */}
                <div style={{
                  flex: 1,
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#374151'
                }}>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMessageContent(contentToShow)
                    }}
                  />

                  {/* Weather indicator */}
                  {message.weatherData && (
                    <div style={{
                      marginTop: '8px',
                      padding: '4px 8px',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '12px',
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>🌤️</span>
                      <span>Weather data included</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Message */}
        {isLoading && (
          <div style={{
            padding: '24px 16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              maxWidth: '768px',
              margin: '0 auto'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#6366f1',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600',
                flexShrink: 0
              }}>
                AI
              </div>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#10b981',
                  borderRadius: '50%',
                  animation: 'typing 1.5s infinite ease-in-out'
                }}></div>
                <div style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#10b981',
                  borderRadius: '50%',
                  animation: 'typing 1.5s infinite ease-in-out',
                  animationDelay: '0.16s'
                }}></div>
                <div style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#10b981',
                  borderRadius: '50%',
                  animation: 'typing 1.5s infinite ease-in-out',
                  animationDelay: '0.32s'
                }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList; 