import React from 'react';
import { useStore } from '../store';
import { PassType } from '../types';
import { Plus, Trash2, Layers, Activity } from 'lucide-react';

const PipelinePanel: React.FC = () => {
  const { passes, selectedPassId, selectPass, addPass, deletePass, setPassInput, setPassFeedback } = useStore();

  return (
    <div className="h-full bg-[#1c1c1e] flex flex-col font-sans">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#2c2c2e]/50 backdrop-blur-sm">
        <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
          <Layers size={16} className="text-blue-400" /> Pipeline
        </h2>
        <button 
          onClick={() => addPass()}
          className="p-1.5 hover:bg-white/10 rounded-full text-green-400 transition"
          title="Add Buffer"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {passes.map((pass) => (
          <div 
            key={pass.id}
            onClick={() => selectPass(pass.id)}
            className={`p-3 rounded-xl border cursor-pointer group transition-all shadow-sm ${
              selectedPassId === pass.id 
                ? 'bg-[#2c2c2e] border-blue-500/50 shadow-blue-500/10' 
                : 'bg-[#2c2c2e]/50 border-transparent hover:bg-[#3a3a3c]'
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <span className={`text-sm font-semibold tracking-wide ${selectedPassId === pass.id ? 'text-white' : 'text-gray-300'}`}>
                {pass.name}
              </span>
              {pass.type === PassType.BUFFER && (
                <button 
                  onClick={(e) => { e.stopPropagation(); deletePass(pass.id); }}
                  className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-full transition"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {/* Config & Inputs */}
            <div className="space-y-3">
              {pass.type === PassType.BUFFER && (
                 <label className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 cursor-pointer select-none">
                    <div className={`w-3 h-3 rounded-full border ${pass.feedback ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}></div>
                    <input 
                      type="checkbox" 
                      checked={pass.feedback}
                      onChange={(e) => setPassFeedback(pass.id, e.target.checked)}
                      className="hidden"
                    />
                    <Activity size={12} /> Feedback Loop
                 </label>
              )}

              <div className="grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map(ch => (
                  <div key={ch} className="relative">
                    <select
                      value={pass.inputs[ch]?.id || ""}
                      onChange={(e) => setPassInput(pass.id, ch, e.target.value || null)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-[#1c1c1e] text-[10px] text-gray-400 border border-white/10 rounded-lg px-2 py-1.5 focus:border-blue-500 outline-none appearance-none hover:bg-[#252527] transition-colors"
                    >
                      <option value="">Ch{ch}: Empty</option>
                      {passes.filter(p => p.id !== pass.id || pass.feedback).map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} {opt.id === pass.id ? "(Self)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelinePanel;