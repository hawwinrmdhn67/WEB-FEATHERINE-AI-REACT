import React, { useEffect, useRef } from 'react';
import Message from './Message';

const ChatWindow = ({ messages }) => {
  const chatRef = useRef();

  useEffect(() => {
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  return (
    <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((msg, i) => (
        <Message key={i} role={msg.role} text={msg.text} />
      ))}
    </div>
  );
};

export default ChatWindow;
