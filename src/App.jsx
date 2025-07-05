import React, { useState, useRef, useEffect, useCallback } from 'react';
import InputBar from './components/InputBar';
import { Plus, Bot, Menu, MessageSquare, Copy } from 'lucide-react';
import { callGroqAPI } from './api/openai';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

function App() {
  const [messages, setMessages] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messageEndRef = useRef(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback(async (newInputMessages) => {
    if (!newInputMessages || newInputMessages.length === 0) return;
    setHasStartedChat(true);

    let userMessageForUI;
    let apiMessageText = '';

    const textInput = newInputMessages.find((msg) => msg.type === 'text');
    const imageInput = newInputMessages.find((msg) => msg.type === 'image');

    if (imageInput && textInput) {
      userMessageForUI = {
        role: 'user',
        type: 'imageWithText',
        content: { image: imageInput.content, text: textInput.content },
      };
      apiMessageText = `![image](${imageInput.content})\n\n${textInput.content.trim()}`;
    } else if (textInput) {
      userMessageForUI = { role: 'user', type: 'text', content: textInput.content };
      apiMessageText = textInput.content.trim();
    } else if (imageInput) {
      userMessageForUI = { role: 'user', type: 'image', content: imageInput.content };
      apiMessageText = `![image](${imageInput.content})`;
    } else return;

    setMessages((prev) => [...prev, userMessageForUI]);

    const messagesForAPI = [
      ...messages.map((msg) => {
        if (msg.role === 'user') {
          if (msg.type === 'text') return { role: 'user', content: msg.content };
          if (msg.type === 'image') return { role: 'user', content: `![image](${msg.content})` };
          if (msg.type === 'imageWithText') return {
            role: 'user',
            content: `![image](${msg.content.image})\n\n${msg.content.text.trim()}`
          };
        } else if (msg.role === 'bot') {
          return { role: 'assistant', content: msg.content };
        }
        return null;
      }).filter(Boolean),
      { role: 'user', content: apiMessageText },
    ];

    setIsTyping(true);
    try {
      const aiReply = await callGroqAPI(messagesForAPI);
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: 'bot', type: 'text', content: aiReply }]);
    } catch (err) {
      setIsTyping(false);
      setMessages((prev) => [...prev, {
        role: 'bot',
        type: 'text',
        content: '⚠️ Maaf, terjadi kesalahan saat menghubungi Featherine AI.',
      }]);
      console.error('API call error:', err);
    }
  }, [messages]);

 return (
    <div className="min-h-screen bg-gray-900 text-white flex relative font-inter">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ x: showSidebar ? 0 : '-100%' }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 h-full w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col justify-between z-50 shadow-lg"
      >
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <img src="https://imagedelivery.net/LBWXYQ-XnKSYxbZ-NuYGqQ/6b6d2b5b-dbf5-43f8-9f99-3a78f44d8700/avatarhd" alt="Featherine Logo" className="h-8 w-8 rounded-full object-cover object-top" />
              <h1 className="text-xl font-bold">Featherine AI</h1>
            </div>
            <button onClick={() => setShowSidebar(false)} className="text-gray-400 hover:text-white text-3xl font-bold leading-none pb-1" aria-label="Close sidebar">×</button>
          </div>

          <div className="space-y-3 mt-8">
            <button onClick={() => {
              setMessages([]);
              setHasStartedChat(false);
              setShowSidebar(false);
              console.log("Chat Baru clicked");
            }} className="w-full bg-purple-700 hover:bg-purple-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2 justify-center transition shadow-md">
              <Plus size={16} /> Chat Baru
            </button>

            <button onClick={() => {
              console.log("Fitur daftar chat belum tersedia.");
              // Optionally, display a temporary message in the UI instead of alert
            }} className="w-full bg-purple-700 hover:bg-purple-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2 justify-center transition shadow-md">
              <MessageSquare size={16} /> Buka List Chat
            </button>
          </div>
        </div>

        <div className="mt-4 px-2 text-yellow-300 text-xs text-center bg-yellow-800/20 border border-yellow-600 rounded-md py-2">
          ⚠️ Jangan upload foto agar AI tidak error karena masih tahap pengembangan.
        </div>
        
        <button onClick={() => {
          console.log("Fitur login Google belum tersedia.");
          // Optionally, display a temporary message in the UI instead of alert
        }} className="w-full bg-white text-gray-900 text-sm px-3 py-2 rounded-lg shadow-md mt-6 flex items-center justify-center gap-2 hover:bg-gray-100 transition">
          {/* New Google Logo SVG */}
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#4285F4" d="M22.56 12.25c0-.62-.05-1.22-.16-1.81H12v3.63h6.4c-.28 1.45-1.17 2.68-2.5 3.53v2.8h3.62c2.11-1.95 3.32-4.82 3.32-8.15z"/>
            <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.94l-3.62-2.8c-1.02.68-2.32 1.08-4.31 1.08-3.32 0-6.13-2.22-7.14-5.22H.86v2.8C2.98 20.53 7.15 23 12 23z"/>
            <path fill="#FBBC05" d="M4.86 14.09c-.2-.68-.31-1.4-.31-2.09s.11-1.41.31-2.09V7.12H1.24C.45 8.78 0 10.33 0 12c0 1.67.45 3.22 1.24 4.88l3.62-2.79z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.59 1.79L19.78 3C17.75 1.14 15.08 0 12 0 7.15 0 2.98 2.47.86 7.12l3.62 2.8C5.87 7.02 8.68 4.75 12 4.75z"/>
          </svg>
          Login dengan Google
        </button>
      </motion.div>

      {/* Overlay for sidebar */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setShowSidebar(false)}
        ></div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen w-full">
        {/* Topbar */}
        <div className="sticky top-0 z-20 bg-gray-800 p-4 shadow-md flex items-center">
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 rounded-full hover:bg-gray-700 transition" aria-label="Toggle sidebar">
            <Menu size={24} className="text-white" />
          </button>
          <h2 className="text-lg font-semibold text-white ml-4">Featherine Chat</h2>
        </div>

        {/* Chat Content */}
        {!hasStartedChat ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center">
            <div>
              <img src="https://imagedelivery.net/LBWXYQ-XnKSYxbZ-NuYGqQ/6b6d2b5b-dbf5-43f8-9f99-3a78f44d8700/avatarhd" alt="Featherine Logo" className="w-24 h-24 rounded-full object-cover object-top shadow-2xl ring-4 ring-purple-500/30 mb-4 mx-auto" />
              <h1 className="text-3xl font-bold text-white mb-2">Hi, aku <span className="text-purple-400">Featherine</span></h1>
              <p className="text-gray-300 text-base">ada yang bisa aku bantu?</p>
            </div>
            <div className="w-full max-w-2xl mt-8 px-4 sm:px-0"> {/* Added px for smaller screens */}
              <InputBar onSend={handleSend} />
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4 pb-36">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.type === 'imageWithText' ? (
                      <div className={`max-w-[90%] sm:max-w-[85%] md:max-w-[60%] w-fit rounded-2xl p-2 break-words shadow flex flex-col gap-2 ${isUser ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white' : 'bg-gray-700 text-white'}`}>
                        <img src={msg.content.image} alt="Uploaded" className="rounded-lg max-w-full h-auto border border-gray-600" />
                        <div>{msg.content.text}</div>
                      </div>
                    ) : msg.type === 'image' ? (
                      <img src={msg.content} alt="Uploaded" className={`max-w-[90%] sm:max-w-[85%] md:max-w-[60%] rounded-lg h-auto border border-gray-600 p-2 shadow ${isUser ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gray-700'}`} />
                    ) : isUser ? (
                      <div className="max-w-[90%] sm:max-w-[85%] md:max-w-[60%] w-fit rounded-2xl px-4 py-2 break-words shadow bg-gradient-to-br from-purple-500 to-purple-700 text-white">
                        <div className="prose prose-invert text-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 max-w-[90%] sm:max-w-[85%] md:max-w-[60%]">
                        <Bot className="text-purple-400 mt-1 flex-shrink-0" size={18} />
                        <div className="flex-grow bg-gray-700 text-white rounded-2xl px-4 py-3 shadow overflow-hidden">
                          <ReactMarkdown
                            components={{
                              code({ node, inline, className, children }) {
                                const [copied, setCopied] = useState(false);
                                const match = /language-(\w+)/.exec(className || '');
                                const codeString = String(children).replace(/\n$/, '');

                                const handleCopy = () => {
                                  const textArea = document.createElement('textarea');
                                  textArea.value = codeString;
                                  document.body.appendChild(textArea);
                                  textArea.select();
                                  try {
                                    document.execCommand('copy');
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                  } catch (err) {
                                    console.error('Failed to copy text:', err);
                                  }
                                  document.body.removeChild(textArea);
                                };

                                if (!inline && match) {
                                  return (
                                    <div className="relative group overflow-x-auto max-w-full rounded-lg my-2">
                                      <button
                                        onClick={handleCopy}
                                        className="absolute top-2 right-2 z-10 bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition flex items-center gap-1"
                                      >
                                        {copied ? 'Copied!' : <Copy size={14} />}
                                      </button>
                                      <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" className="text-sm rounded-lg" wrapLongLines={true}>
                                        {codeString}
                                      </SyntaxHighlighter>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <code className="bg-gray-800 text-purple-300 px-1 py-0.5 rounded text-sm inline-block break-words whitespace-pre-wrap">
                                      {children}
                                    </code>
                                  );
                                }
                              },
                              img: ({ node, ...props }) => <img className="max-w-full h-auto rounded-lg" {...props} />,
                              table: ({ node, ...props }) => (
                                <div className="overflow-x-auto my-2">
                                  <table className="min-w-full divide-y divide-gray-600 rounded-lg overflow-hidden" {...props} />
                                </div>
                              ),
                              pre: ({ node, ...props }) => (
                                <div className="overflow-x-auto my-2 rounded-lg">
                                  <pre className="p-3 bg-gray-800 text-gray-200 rounded-lg text-sm" {...props} />
                                </div>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
              {isTyping && (
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/30 backdrop-blur-sm rounded-2xl rounded-bl-md max-w-fit self-start animate-pulse">
                  <Bot size={16} className="text-purple-400" />
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messageEndRef} />
            </div>

            <div className="sticky bottom-0 bg-gray-900 p-4 border-t border-gray-800 z-30">
              <InputBar onSend={handleSend} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
