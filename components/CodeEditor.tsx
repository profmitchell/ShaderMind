import React, { useEffect, useRef, useState } from 'react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  return (
    <div className="relative w-full h-full flex font-mono text-sm bg-[#1e1e1e] text-[#d4d4d4]">
      {/* Line Numbers */}
      <div
        ref={lineNumbersRef}
        className="w-12 pt-2 pr-2 text-right bg-[#1e1e1e] text-[#858585] border-r border-[#333] select-none overflow-hidden leading-6"
      >
        <pre>{lineNumbers}</pre>
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className="flex-1 p-2 bg-transparent outline-none resize-none leading-6 whitespace-pre"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
      />
    </div>
  );
};

export default CodeEditor;