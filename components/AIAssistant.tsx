import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Sparkles, Send, Bot, Paperclip, X, FileVideo, Trash2 } from 'lucide-react';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const AIAssistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I'm your Shader Copilot. Upload an image or video to generate a shader from it!", timestamp: Date.now() }
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

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      setMessages([{ role: 'model', text: "Chat history cleared. What are we making next?", timestamp: Date.now() }]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > MAX_FILE_SIZE) {
        alert("File too large. Please select a file under 15MB.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setAttachments(prev => [...prev, evt.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMsg: ChatMessage = { 
      role: 'user', 
      text: input, 
      attachments: [...attachments],
      timestamp: Date.now() 
    };
    
    // Optimistically update UI
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      // Pass the ENTIRE history to the service, so the model sees context
      const response = await sendMessageToGemini(newHistory, state);
      
      const modelMsg: ChatMessage = { role: 'model', text: response.message, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);

      // Execute actions
      if (response.actions) {
        response.actions.forEach(action => {
          applyAIAction(action);
        });
      }

    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: "Error connecting to AI.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderAttachmentPreview = (dataUri: string, index: number, onRemove?: (idx: number) => void) => {
    const isVideo = dataUri.startsWith('data:video');
    return (
      <div key={index} className="relative group shrink-0">
        {isVideo ? (
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/20 bg-black">
             <video src={dataUri} className="w-full h-full object-cover opacity-80" muted loop autoPlay playsInline />
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <FileVideo size={16} className="text-white/80" />
             </div>
          </div>
        ) : (
          <img src={dataUri} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-white/20" />
        )}
        
        {onRemove && (
          <button 
            onClick={() => onRemove(index)}
            className="absolute -top-1 -right-1 bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <X size={10} />
          </button>
        )}
      </div>
    );
  };

  const renderMessageAttachments = (atts: string[]) => {
    return (
      <div className="flex gap-2 mb-2 flex-wrap">
        {atts.map((att, idx) => {
           const isVideo = att.startsWith('data:video');
           return isVideo ? (
             <video key={idx} src={att} className="max-w-[150px] max-h-[150px] rounded-lg border border-white/20" controls muted />
           ) : (
             <img key={idx} src={att} alt="attachment" className="w-24 h-24 object-cover rounded-lg border border-white/20" />
           );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#1c1c1e] text-sm font-sans">
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#2c2c2e]/50 backdrop-blur-md">
        <div className="flex items-center gap-2 text-purple-400 font-bold">
          <Sparkles size={16} /> Shader Copilot
        </div>
        <button 
          onClick={handleClearChat}
          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition"
          title="Clear Chat History"
        >
          <Trash2 size={14} />
        </button>
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
              
              {msg.attachments && msg.attachments.length > 0 && renderMessageAttachments(msg.attachments)}
              
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
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
            {attachments.map((att, idx) => renderAttachmentPreview(att, idx, removeAttachment))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-[#2c2c2e] p-1.5 rounded-3xl border border-white/10 focus-within:border-blue-500/50 transition-colors">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,video/*"
            onChange={handleFileSelect}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-white transition rounded-full hover:bg-white/10"
            title="Attach Media"
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
            placeholder="Describe your idea or refinement..."
            className="flex-1 bg-transparent text-gray-200 py-2 max-h-32 min-h-[40px] resize-none focus:outline-none text-sm placeholder:text-gray-500"
            rows={1}
          />
          
          <button 
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
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