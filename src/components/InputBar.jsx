import React, { useState, useRef, useEffect } from 'react';
import { ImagePlus, Send, X } from 'lucide-react';

function InputBar({ onSend }) {
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [shouldShowScroll, setShouldShowScroll] = useState(false);
  const fileInputRef = useRef();
  const textareaRef = useRef();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() && !image) return;

    const newMessages = [];
    if (image) newMessages.push({ type: 'image', content: image });
    if (input.trim()) newMessages.push({ type: 'text', content: input.trim() });

    onSend(newMessages);
    setInput('');
    setImage(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      setShouldShowScroll(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e) => {
    const el = e.target;
    setInput(el.value);


    el.style.height = 'auto';
    el.style.transition = 'height 0.15s ease';
    el.style.height = `${el.scrollHeight}px`;


    setShouldShowScroll(el.scrollHeight > el.clientHeight + 1);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.transition = '';
    }
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {image && (
        <div className="relative w-fit max-w-xs border border-gray-700 rounded-lg overflow-hidden shadow-md">
          <img src={image} alt="Preview" className="max-h-40 object-contain rounded-lg" />
          <button
            type="button"
            onClick={() => setImage(null)}
            className="absolute top-1 right-1 bg-black/50 p-1 rounded-full hover:bg-black/80 transition"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">

        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          aria-label="Upload image"
        >
          <ImagePlus size={18} className="text-white" />
        </button>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageUpload}
        />


        <textarea
          ref={textareaRef}
          placeholder="Tulis pesan..."
          className={`flex-1 p-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none resize-none max-h-[200px] scroll-smooth ${
            shouldShowScroll ? 'overflow-auto' : 'overflow-hidden'
          }`}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          rows={1}
        />


        <button
          type="submit"
          className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
          aria-label="Kirim pesan"
        >
          <Send size={18} className="text-white" />
        </button>
      </div>
    </form>
  );
}

export default InputBar;
