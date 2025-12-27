import React, { useState, useEffect } from 'react';
import PipelinePanel from './components/PipelinePanel';
import Viewport from './components/Viewport';
import AIAssistant from './components/AIAssistant';
import CodeEditor from './components/CodeEditor';
import { useStore } from './store';
import { EditorMode } from './types';
import { Play, Pause, Save, FolderOpen, Layout, MessageSquare, Code2, MonitorPlay, Zap, Palette } from 'lucide-react';

const App: React.FC = () => {
  const { passes, selectedPassId, updatePassCode, isPlaying, togglePlay, mode, setMode, p5Code, setP5Code } = useStore();
  const selectedPass = passes.find(p => p.id === selectedPassId);

  // Responsive State
  const [activeTab, setActiveTab] = useState<'view' | 'pipeline' | 'code' | 'ai'>('view');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleExport = () => {
    const data = JSON.stringify(useStore.getState(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_${mode}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        useStore.getState().loadProject(json);
      } catch (err) {
        console.error("Failed to load project", err);
      }
    };
    reader.readAsText(file);
  };

  // UI Helpers
  const isShaderMode = mode === EditorMode.SHADER;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#000] text-gray-200 overflow-hidden font-sans">
      
      {/* Header - Sticky Top */}
      <header className="h-14 bg-[#1c1c1e]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/20">
            <Layout size={18} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-white hidden md:block">
            ShaderMind
          </h1>
          
          {/* Mode Switcher */}
          <div className="flex bg-[#2c2c2e] p-1 rounded-lg border border-white/5">
             <button 
               onClick={() => setMode(EditorMode.SHADER)}
               className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${mode === EditorMode.SHADER ? 'bg-[#444] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
             >
               <Zap size={12} /> GLSL
             </button>
             <button 
               onClick={() => setMode(EditorMode.P5)}
               className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${mode === EditorMode.P5 ? 'bg-[#d5358f] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
             >
               <Palette size={12} /> P5.JS
             </button>
          </div>

          <div className="h-6 w-[1px] bg-white/10 hidden sm:block"></div>
          
          {isShaderMode && (
            <button 
              onClick={togglePlay} 
              className={`p-2 rounded-full transition-all ${isPlaying ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
           <label className="p-2 hover:bg-white/10 rounded-lg cursor-pointer transition text-gray-400 hover:text-white">
             <FolderOpen size={20} />
             <input type="file" className="hidden" accept=".json" onChange={handleImport} />
           </label>
           <button onClick={handleExport} className="p-2 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white">
             <Save size={20} />
           </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* DESKTOP LAYOUT */}
        {!isMobile && (
          <>
            {/* Left: Pipeline (Only in Shader Mode) */}
            {isShaderMode && (
              <div className="w-64 border-r border-white/10 flex flex-col z-10 transition-all duration-300">
                <PipelinePanel />
              </div>
            )}

            {/* Center: Viewport */}
            <div className="flex-1 bg-black relative flex flex-col min-w-0 z-0">
              <Viewport />
            </div>

            {/* Right: Editor & AI */}
            <div className="w-[450px] flex flex-col border-l border-white/10 bg-[#1c1c1e] z-10">
              {/* Top Half: Code Editor */}
              <div className="flex-[3] flex flex-col min-h-0 border-b border-white/10">
                 <div className="h-10 bg-[#2c2c2e] flex items-center px-4 text-xs font-medium text-gray-400 border-b border-white/5 justify-between">
                    <span>
                      {isShaderMode 
                        ? (selectedPass ? `${selectedPass.name}.glsl` : "No selection") 
                        : "sketch.js"}
                    </span>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded">
                      {isShaderMode ? "GLSL ES 3.0" : "P5.js"}
                    </span>
                 </div>
                 <div className="flex-1 relative overflow-hidden">
                    {isShaderMode && selectedPass && (
                      <CodeEditor 
                        code={selectedPass.fragmentShader} 
                        onChange={(code) => updatePassCode(selectedPass.id, code)}
                      />
                    )}
                    {!isShaderMode && (
                       <CodeEditor 
                        code={p5Code} 
                        onChange={(code) => setP5Code(code)}
                      />
                    )}
                 </div>
              </div>

              {/* Bottom Half: AI Copilot */}
              <div className="flex-[2] min-h-[250px] flex flex-col">
                <AIAssistant />
              </div>
            </div>
          </>
        )}

        {/* MOBILE LAYOUT */}
        {isMobile && (
          <div className="flex-1 w-full h-full relative">
            <div className={`absolute inset-0 bg-black ${activeTab === 'view' ? 'z-10' : 'z-0'}`}>
               <Viewport />
            </div>
            
            {activeTab === 'pipeline' && isShaderMode && (
              <div className="absolute inset-0 z-20 bg-[#1c1c1e]">
                <PipelinePanel />
              </div>
            )}
            
            {activeTab === 'code' && (
              <div className="absolute inset-0 z-20 bg-[#1e1e1e] flex flex-col">
                 <div className="h-10 bg-[#2c2c2e] flex items-center px-4 text-xs font-medium text-gray-400 border-b border-white/5">
                   {isShaderMode ? (selectedPass ? `${selectedPass.name}.glsl` : "Select a pass") : "sketch.js"}
                 </div>
                 <div className="flex-1 relative">
                  {isShaderMode && selectedPass ? (
                    <CodeEditor 
                      code={selectedPass.fragmentShader} 
                      onChange={(code) => updatePassCode(selectedPass.id, code)}
                    />
                  ) : !isShaderMode ? (
                     <CodeEditor 
                      code={p5Code} 
                      onChange={(code) => setP5Code(code)}
                    />
                  ) : null}
                 </div>
              </div>
            )}
            
            {activeTab === 'ai' && (
              <div className="absolute inset-0 z-20 bg-[#1c1c1e]">
                <AIAssistant />
              </div>
            )}
          </div>
        )}

      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="h-16 bg-[#1c1c1e] border-t border-white/10 flex justify-around items-center shrink-0 z-30 pb-safe">
          <button 
            onClick={() => setActiveTab('view')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${activeTab === 'view' ? 'text-blue-400' : 'text-gray-500'}`}
          >
            <MonitorPlay size={20} />
            <span className="text-[10px] font-medium">View</span>
          </button>
          
          {isShaderMode && (
            <button 
              onClick={() => setActiveTab('pipeline')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${activeTab === 'pipeline' ? 'text-blue-400' : 'text-gray-500'}`}
            >
              <Layout size={20} />
              <span className="text-[10px] font-medium">Pipeline</span>
            </button>
          )}
          
          <button 
            onClick={() => setActiveTab('code')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${activeTab === 'code' ? 'text-blue-400' : 'text-gray-500'}`}
          >
            <Code2 size={20} />
            <span className="text-[10px] font-medium">Code</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${activeTab === 'ai' ? 'text-purple-400' : 'text-gray-500'}`}
          >
            <MessageSquare size={20} />
            <span className="text-[10px] font-medium">AI</span>
          </button>
        </nav>
      )}

    </div>
  );
};

export default App;