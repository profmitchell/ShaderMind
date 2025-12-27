import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Sparkles, Send, Bot, Paperclip, X } from 'lucide-react';

const AIAssistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I'm your Shader Copilot. Upload an image to generate a shader from it!", timestamp: Date.now() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Connect to global store to act on it
  const { applyAIAction } = useStore();
  const state = useStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setAttachedImages(prev => [...prev, evt.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedImages.length === 0) || isLoading) return;

    const userMsg: ChatMessage = { 
      role: 'user', 
      text: input, 
      images: [...attachedImages],
      timestamp: Date.now() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedImages([]);
    setIsLoading(true);

    try {
      const response = await sendMessageToGemini(userMsg.text, userMsg.images || [], state);
      
      const modelMsg: ChatMessage = { role: 'model', text: response.message, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);

      // Execute actions
      if (response.actions) {
        response.actions.forEach(action => {
          applyAIAction(action);
        });
      }

    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Error connecting to AI.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1c1c1e] text-sm font-sans">
      <div className="p-3 border-b border-white/10 flex items-center gap-2 text-purple-400 font-bold bg-[#2c2c2e]/50 backdrop-blur-md">
        <Sparkles size={16} /> Shader Copilot
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-[#3a3a3c] text-gray-200 rounded-bl-none'
            }`}>
              {msg.role === 'model' && <Bot size={14} className="mb-1 text-purple-400" />}
              
              {/* Image previews in chat history */}
              {msg.images && msg.images.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {msg.images.map((img, idx) => (
                    <img key={idx} src={img} alt="attachment" className="w-24 h-24 object-cover rounded-lg border border-white/20" />
                  ))}
                </div>
              )}
              
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
            <span className="text-[10px] text-gray-500 mt-1 px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-[#3a3a3c] px-4 py-2 rounded-2xl rounded-bl-none text-gray-400 text-xs animate-pulse">
                Thinking...
             </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/10 bg-[#1c1c1e]">
        {/* Attachment Preview Area */}
        {attachedImages.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
            {attachedImages.map((img, idx) => (
              <div key={idx} className="relative group shrink-0">
                <img src={img} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-white/20" />
                <button 
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1 -right-1 bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-[#2c2c2e] p-1.5 rounded-3xl border border-white/10 focus-within:border-blue-500/50 transition-colors">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-white transition rounded-full hover:bg-white/10"
            title="Attach Image"
          >
            <Paperclip size={18} />
          </button>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe your shader..."
            className="flex-1 bg-transparent text-gray-200 py-2 max-h-32 min-h-[40px] resize-none focus:outline-none text-sm placeholder:text-gray-500"
            rows={1}
          />
          
          <button 
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && attachedImages.length === 0)}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition shadow-lg"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;