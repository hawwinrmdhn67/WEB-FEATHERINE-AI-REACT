import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy } from 'lucide-react';

const CodeBlock = ({ inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (!inline && match) {
    return (
      <div className="relative group overflow-x-auto my-2 rounded-lg">
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition flex items-center gap-1"
        >
          {copied ? 'Copied!' : <Copy size={14} />}
        </button>
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          className="text-sm rounded-lg"
          wrapLongLines
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code className="bg-gray-800 text-purple-300 px-1 py-0.5 rounded text-sm inline-block break-words whitespace-pre-wrap">
      {children}
    </code>
  );
};

export default CodeBlock;
