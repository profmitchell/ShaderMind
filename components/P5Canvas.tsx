import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';

const P5Canvas: React.FC = () => {
  const { p5Code } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // We debounce code updates to prevent flashing on every keystroke
  const [debouncedCode, setDebouncedCode] = useState(p5Code);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCode(p5Code);
    }, 1000);
    return () => clearTimeout(handler);
  }, [p5Code]);

  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.js"></script>
        <style>
          body { margin: 0; padding: 0; overflow: hidden; background: #000; }
          canvas { display: block; }
        </style>
      </head>
      <body>
        <script>
          // Catch errors and send to parent (optional implementation)
          window.onerror = function(message, source, lineno, colno, error) {
            console.error(message);
          };
          
          try {
            ${debouncedCode}
          } catch(e) {
            console.error(e);
          }
        </script>
      </body>
    </html>
  `;

  return (
    <div ref={containerRef} className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
      <iframe 
        title="p5-sandbox"
        srcDoc={srcDoc}
        className="w-full h-full border-none"
        sandbox="allow-scripts"
      />
      <div className="absolute top-2 left-2 text-xs text-white/50 font-mono pointer-events-none">
         P5.JS Mode
      </div>
    </div>
  );
};

export default P5Canvas;