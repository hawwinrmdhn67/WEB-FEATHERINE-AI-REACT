import React, { useState, useRef, useEffect, useCallback } from 'react';
import InputBar from './components/InputBar';
import { Plus, Bot, Menu, MessageSquare, Copy, Trash2, LogOut } from 'lucide-react';
import { callGroqAPI } from './api/openai';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { supabase } from "./backend/supabase";
import Swal from 'sweetalert2';

const saveSessionToSupabase = async (sessionMessages, userId) => {
  const { error } = await supabase
    .from('chat_sessions')
    .insert([{ messages: sessionMessages, user_id: userId || null }]);

  if (error) console.error('Gagal simpan ke Supabase:', error);
};

function App() {
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentSession, setCurrentSession] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState(null);
  const messageEndRef = useRef(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserChatHistory = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Gagal ambil chat history:', error);
      } else {
        setChatHistory(data || []);
      }
    };

    fetchUserChatHistory();
  }, [user]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, isTyping ? 100 : 300);
    return () => clearTimeout(timeout);
  }, [messages, isTyping]);

  useEffect(() => {
    if (!user) {
      const savedHistory = localStorage.getItem('chatHistory');
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          const validSessions = parsed.filter(s => Array.isArray(s.messages));
          setChatHistory(validSessions);
        } catch (e) {
          localStorage.removeItem('chatHistory');
        }
      }
    }
  }, [user]);

  useEffect(() => {
  const handleClickOutside = (event) => {
    if (!event.target.closest('.user-menu-avatar')) {
      setShowUserMenu(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);


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

    setMessages(prev => [...prev, userMessageForUI]);
    setCurrentSession(prev => [...prev, userMessageForUI]);

    const messagesForAPI = [
      ...messages.map((msg) => {
        if (msg.role === 'user') {
          if (msg.type === 'text') return { role: 'user', content: msg.content };
          if (msg.type === 'image') return { role: 'user', content: `![image](${msg.content})` };
          if (msg.type === 'imageWithText') {
            return { role: 'user', content: `![image](${msg.content.image})\n\n${msg.content.text.trim()}` };
          }
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

      const botMessage = { role: 'bot', type: 'text', content: aiReply };
      setMessages(prev => [...prev, botMessage]);
      setCurrentSession(prev => [...prev, botMessage]);

      const newSession = {
        id: Date.now(),
        messages: [...currentSession, userMessageForUI, botMessage],
      };

      if (user) {
        await saveSessionToSupabase(newSession.messages, user.id);
        setChatHistory(prev => [newSession, ...prev]);
      } else {
        setChatHistory(prev => {
          const updated = [newSession, ...prev];
          localStorage.setItem('chatHistory', JSON.stringify(updated));
          return updated;
        });
      }

      setCurrentSession([]);
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'bot',
        type: 'text',
        content: '⚠️ Maaf, terjadi kesalahan saat menghubungi Featherine AI.',
      }]);
      console.error('API call error:', err);
    }
  }, [messages, currentSession, user]);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Yakin logout?',
      text: 'Semua riwayat akan direset ke mode tanpa login.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Logout',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#9333ea',
    });

    if (result.isConfirmed) {
      await supabase.auth.signOut();
      setUser(null);
      setMessages([]);
      setCurrentSession([]);
      setHasStartedChat(false);

      const savedHistory = localStorage.getItem('chatHistory');
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          const validSessions = parsed.filter(s => Array.isArray(s.messages));
          setChatHistory(validSessions);
        } catch {
          setChatHistory([]);
        }
      } else {
        setChatHistory([]);
      }

      Swal.fire({
        title: 'Logout berhasil!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const handleClearHistory = async () => {
    if (user) {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', user.id);
      if (error) console.error('Gagal hapus riwayat di database:', error);
    } else {
      localStorage.removeItem('chatHistory');
    }
    setChatHistory([]);
    setShowChatList(false);
    setTimeout(() => setShowChatList(true), 10);
  };

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
              <img
                src="https://imagedelivery.net/LBWXYQ-XnKSYxbZ-NuYGqQ/6b6d2b5b-dbf5-43f8-9f99-3a78f44d8700/avatarhd"
                alt="Featherine Logo"
                className="h-8 w-8 rounded-full object-cover object-top"
              />
              <h1 className="text-xl font-bold">Featherine AI</h1>
            </div>
            <button onClick={() => setShowSidebar(false)} className="text-gray-400 hover:text-white text-3xl font-bold leading-none pb-1">×</button>
          </div>

          <div className="space-y-3 mt-8">
            <button
              onClick={() => {
                setMessages([]);
                setHasStartedChat(false);
                setShowSidebar(false);
                setCurrentSession([]);
              }}
              className="w-full bg-purple-700 hover:bg-purple-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2 justify-center transition shadow-md"
            >
              <Plus size={16} /> Chat Baru
            </button>

            <button
              onClick={() => setShowChatList(!showChatList)}
              className="w-full bg-purple-700 hover:bg-purple-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2 justify-center transition shadow-md"
            >
              <MessageSquare size={16} /> Buka List Chat
            </button>

            {showChatList && (
              <div className="bg-purple-700/60 mt-2 p-3 rounded-lg max-h-48 overflow-y-auto border border-purple-600 text-sm space-y-2 shadow-inner">
                {chatHistory.length === 0 ? (
                  <p className="text-gray-300 text-sm text-center">Belum ada chat.</p>
                ) : (
                  <>
                    {chatHistory.map((session, idx) => (
                      <div
                        key={session.id || idx}
                        className="bg-purple-800/80 text-white px-3 py-1 rounded hover:bg-purple-900 cursor-pointer truncate transition"
                        onClick={() => {
                          setMessages(session.messages);
                          setHasStartedChat(true);
                          setShowSidebar(false);
                        }}
                      >
                        {session?.messages?.find(msg => msg.role === 'user')?.content?.slice(0, 40) || 'Chat'}
                      </div>
                    ))}
                    <hr className="my-2 border-purple-500/40" />
                    <button
                      onClick={async () => {
                        setChatHistory([]);
                        setMessages([]);
                        setCurrentSession([]);
                        setHasStartedChat(false);
                        localStorage.removeItem('chatHistory');

                        if (user) {
                          const { error } = await supabase
                            .from('chat_sessions')
                            .delete()
                            .eq('user_id', user.id);

                          if (error) {
                            console.error('Gagal menghapus riwayat dari Supabase:', error.message);
                          } else {
                            console.log('Riwayat berhasil dihapus dari Supabase');
                          }
                        }

                        // Reset ulang tampilan list chat
                        setShowChatList(false);
                        setTimeout(() => setShowChatList(true), 10);
                      }}
                      className="w-full bg-purple-700 hover:bg-purple-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2 justify-center transition shadow-md"
                    >
                      <Trash2 size={16} /> Hapus Semua Riwayat
                    </button>

                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 px-2 text-yellow-300 text-xs text-center bg-yellow-800/20 border border-yellow-600 rounded-md py-2">
          ⚠️ Jangan upload foto agar AI tidak error karena masih tahap pengembangan.
        </div>

        <button
          onClick={async () => {
            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
            });
            if (error) {
              console.error('Login gagal:', error.message);
            }
          }}
          className="w-full bg-white text-gray-900 text-sm px-3 py-2 rounded-lg shadow-md mt-6 flex items-center justify-center gap-2 hover:bg-gray-100 transition"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.62-.05-1.22-.16-1.81H12v3.63h6.4c-.28 1.45-1.17 2.68-2.5 3.53v2.8h3.62c2.11-1.95 3.32-4.82 3.32-8.15z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.95-1.08 7.93-2.94l-3.62-2.8c-1.02.68-2.32 1.08-4.31 1.08-3.32 0-6.13-2.22-7.14-5.22H.86v2.8C2.98 20.53 7.15 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M4.86 14.09c-.2-.68-.31-1.4-.31-2.09s.11-1.41.31-2.09V7.12H1.24C.45 8.78 0 10.33 0 12c0 1.67.45 3.22 1.24 4.88l3.62-2.79z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.59 1.79L19.78 3C17.75 1.14 15.08 0 12 0 7.15 0 2.98 2.47.86 7.12l3.62 2.8C5.87 7.02 8.68 4.75 12 4.75z"
            />
          </svg>
          Login dengan Google
        </button>
      </motion.div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col h-screen w-full">
        <div className="sticky top-0 z-20 bg-gray-800 px-4 py-4 shadow-md flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 rounded-full hover:bg-gray-700 transition">
              <Menu size={24} className="text-white" />
            </button>
            <img
              src="https://imagedelivery.net/LBWXYQ-XnKSYxbZ-NuYGqQ/6b6d2b5b-dbf5-43f8-9f99-3a78f44d8700/avatarhd"
              className="w-6 h-6 rounded-full ml-3"
              alt="Featherine Logo"
            />
            <h2 className="text-lg font-semibold text-white ml-2">Featherine</h2>
          </div>
          {user && (
            <div className="relative">
              <img
                src={user.user_metadata?.avatar_url || "https://ui-avatars.com/api/?name=U&background=6B21A8&color=fff"}
                alt="User Avatar"
                className="w-8 h-8 rounded-full border border-purple-500 shadow cursor-pointer"
                onClick={() => setShowUserMenu(prev => !prev)}
              />
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-white truncate">{user.user_metadata?.full_name}</p>
                    <p className="text-sm text-gray-400 truncate">{user.email}</p>
                  </div>
                  <div className="border-t border-gray-700" />
                  <button
                    onClick={async () => {
                      const result = await Swal.fire({
                        icon: 'warning',
                        title: 'Yakin ingin logout?',
                        text: 'Featherine akan sedih jika kamu logout :(',
                        showCancelButton: true,
                        confirmButtonText: 'Ya, Logout',
                        cancelButtonText: 'Batal',
                        confirmButtonColor: '#8B5CF6',
                        cancelButtonColor: '#4B5563',
                        background: '#1F2937',
                        color: '#fff',
                      });

                      if (result.isConfirmed) {
                        const { error } = await supabase.auth.signOut();
                        if (error) {
                          console.error('Logout gagal:', error.message);
                        } else {
                          Swal.fire({
                            icon: 'success',
                            title: 'Logout Berhasil',
                            text: 'Created By HawwinRomadhon',
                            confirmButtonColor: '#8B5CF6',
                            background: '#1F2937',
                            color: '#fff',
                          });

                          setUser(null);
                          setMessages([]);
                          setHasStartedChat(false);
                          setCurrentSession([]);
                          setShowUserMenu(false);

                          const saved = localStorage.getItem('chatHistory');
                          if (saved) {
                            try {
                              const parsed = JSON.parse(saved);
                              const valid = parsed.filter(s => Array.isArray(s.messages));
                              setChatHistory(valid);
                            } catch (e) {
                              localStorage.removeItem('chatHistory');
                              setChatHistory([]);
                            }
                          } else {
                            setChatHistory([]);
                          }
                        }
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

        </div>


        {!hasStartedChat ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center">
            <img src="https://imagedelivery.net/LBWXYQ-XnKSYxbZ-NuYGqQ/6b6d2b5b-dbf5-43f8-9f99-3a78f44d8700/avatarhd" alt="Featherine Logo" className="w-24 h-24 rounded-full object-cover object-top shadow-2xl ring-4 ring-purple-500/30 mb-4 mx-auto" />
            <h1 className="text-3xl font-bold text-white mb-2">Hi, aku <span className="text-purple-400">Featherine</span></h1>
            <p className="text-gray-300 text-base">ada yang bisa aku bantu?</p>
            <div className="w-full max-w-2xl mt-8 px-4 sm:px-0">
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
                    <div className={`max-w-[90%] sm:max-w-[85%] md:max-w-[60%] w-fit rounded-2xl px-4 py-2 break-words shadow text-sm ${isUser ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white' : 'bg-gray-700 text-white'}`}>
                      {msg.type === 'imageWithText' ? (
                        <>
                          <img src={msg.content.image} alt="Uploaded" className="rounded-lg max-w-full h-auto border border-gray-600 mb-2" />
                          <div>{msg.content.text}</div>
                        </>
                      ) : msg.type === 'image' ? (
                        <img src={msg.content} alt="Uploaded" className="rounded-lg max-w-full h-auto border border-gray-600" />
                      ) : (
                        <ReactMarkdown
                          components={{
                            code({ inline, className, children }) {
                              const codeString = String(children).replace(/\n$/, '');
                              const language = (className || '').replace('language-', '');
                              const [copied, setCopied] = useState(false);

                              const handleCopy = () => {
                                navigator.clipboard.writeText(codeString);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1500);
                              };

                              if (inline) {
                                return <code className="bg-purple-950 text-purple-300 px-1 py-0.5 rounded">{codeString}</code>;
                              }

                              return (
                                <div className="relative group overflow-x-auto max-w-full my-2 rounded-lg">
                                  <button
                                    onClick={handleCopy}
                                    className="absolute top-2 right-2 z-10 bg-purple-800 text-purple-200 hover:bg-purple-700 border border-purple-600 rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition flex items-center gap-1"
                                  >
                                    {copied ? 'Copied!' : <Copy size={14} />}
                                  </button>
                                  <SyntaxHighlighter
                                    style={oneDark}
                                    language={language}
                                    PreTag="div"
                                    className="text-sm rounded-lg"
                                    wrapLongLines
                                  >
                                    {codeString}
                                  </SyntaxHighlighter>
                                </div>
                              );
                            }
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {isTyping && (
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/30 backdrop-blur-sm rounded-2xl max-w-fit self-start animate-pulse">
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
