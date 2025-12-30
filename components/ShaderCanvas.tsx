import React, { useRef, useLayoutEffect, useEffect } from 'react';
import { useStore } from '../store';
import { ShaderPass, PassType, GlslDialect } from '../types';
import { VERTEX_SHADER_DEFAULT, SHADERTOY_PRELUDE, SHADERTOY_SUFFIX } from '../constants';

class Renderer {
  gl: WebGL2RenderingContext;
  programs: Map<string, WebGLProgram> = new Map();
  buffers: Map<string, { read: WebGLTexture, write: WebGLTexture, fboRead: WebGLFramebuffer, fboWrite: WebGLFramebuffer }> = new Map();
  
  canvas: HTMLCanvasElement;
  width: number = 800;
  height: number = 600;
  dialect: GlslDialect = 'standard';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;
    gl.getExtension('EXT_color_buffer_float');
  }

  setDialect(d: GlslDialect) {
    this.dialect = d;
  }

  resize(w: number, h: number) {
    if (this.width === w && this.height === h) return;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    this.buffers.forEach((buffer, id) => {
      this.setupBufferStorage(buffer.read);
      this.setupBufferStorage(buffer.write);
    });
  }

  setupBufferStorage(tex: WebGLTexture) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  createBufferSet(id: string) {
    const gl = this.gl;
    const createTexFbo = () => {
      const tex = gl.createTexture()!;
      this.setupBufferStorage(tex);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fbo };
    };
    const b1 = createTexFbo();
    const b2 = createTexFbo();
    this.buffers.set(id, { read: b1.tex, fboRead: b1.fbo, write: b2.tex, fboWrite: b2.fbo });
  }

  compileShader(src: string, type: number): WebGLShader | null {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Shader Compile Error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  updateProgram(id: string, fragSrc: string) {
    const gl = this.gl;
    
    // Wrap shader if in Shadertoy mode
    let finalFragSrc = fragSrc;
    if (this.dialect === 'shadertoy') {
       finalFragSrc = `${SHADERTOY_PRELUDE}\n${fragSrc}\n${SHADERTOY_SUFFIX}`;
    }

    const vs = this.compileShader(VERTEX_SHADER_DEFAULT, gl.VERTEX_SHADER);
    const fs = this.compileShader(finalFragSrc, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return false;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("Link Error:", gl.getProgramInfoLog(prog));
      return false;
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (this.programs.has(id)) gl.deleteProgram(this.programs.get(id)!);
    this.programs.set(id, prog);
    return true;
  }

  render(passes: ShaderPass[], time: number, mouse: number[], frame: number, dt: number) {
    const gl = this.gl;

    passes.forEach(p => {
      if (p.type === PassType.BUFFER && !this.buffers.has(p.id)) this.createBufferSet(p.id);
    });

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    
    for (const pass of passes) {
      const prog = this.programs.get(pass.id);
      if (!prog) continue;

      gl.useProgram(prog);
      gl.uniform3f(gl.getUniformLocation(prog, "iResolution"), this.width, this.height, 1.0);
      gl.uniform1f(gl.getUniformLocation(prog, "iTime"), time);
      gl.uniform1f(gl.getUniformLocation(prog, "iTimeDelta"), dt);
      gl.uniform1f(gl.getUniformLocation(prog, "iFrame"), frame); // Shadertoy expects float, renderer usually ints, standardizing on float here
      gl.uniform4f(gl.getUniformLocation(prog, "iMouse"), mouse[0], mouse[1], mouse[2], mouse[3]);
      
      // Additional Shadertoy uniforms
      const d = new Date();
      gl.uniform4f(gl.getUniformLocation(prog, "iDate"), d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds());
      gl.uniform1f(gl.getUniformLocation(prog, "iSampleRate"), 44100.0);

      [0, 1, 2, 3].forEach(ch => {
        const input = pass.inputs[ch];
        gl.uniform1i(gl.getUniformLocation(prog, `iChannel${ch}`), ch);
        
        // Pass resolution for this channel
        const resLoc = gl.getUniformLocation(prog, `iChannelResolution[${ch}]`);
        if(resLoc) gl.uniform3f(resLoc, this.width, this.height, 1.0); // Assume internal buffers match screen for now

        gl.activeTexture(gl.TEXTURE0 + ch);
        if (input && input.type === 'pass' && input.id) {
          const sourceBuf = this.buffers.get(input.id);
          if (sourceBuf) gl.bindTexture(gl.TEXTURE_2D, sourceBuf.read);
          else gl.bindTexture(gl.TEXTURE_2D, null);
        } else {
          gl.bindTexture(gl.TEXTURE_2D, null);
        }
      });

      if (pass.type === PassType.BUFFER) gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers.get(pass.id)!.fboWrite);
      else gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const posLoc = gl.getAttribLocation(prog, "position");
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    gl.deleteBuffer(buf);

    passes.forEach(p => {
      if (p.type === PassType.BUFFER) {
        const buf = this.buffers.get(p.id)!;
        const tempTex = buf.read; const tempFbo = buf.fboRead;
        buf.read = buf.write; buf.fboRead = buf.fboWrite;
        buf.write = tempTex; buf.fboWrite = tempFbo;
      }
    });
  }
}

const ShaderCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const { passes, time, resolution, mouse, isPlaying, incrementTime, setMouse, glslDialect } = useStore();

  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    try {
      rendererRef.current = new Renderer(canvasRef.current);
    } catch (e) { console.error(e); }
  }, []);

  // Sync Dialect
  useEffect(() => {
    if (rendererRef.current) {
        rendererRef.current.setDialect(glslDialect);
        // Recompile all passes when dialect changes
        passes.forEach(p => rendererRef.current!.updateProgram(p.id, p.fragmentShader));
    }
  }, [glslDialect, passes]);

  useEffect(() => {
    if (!rendererRef.current) return;
    passes.forEach(p => rendererRef.current!.updateProgram(p.id, p.fragmentShader));
  }, [passes]);

  useEffect(() => {
    const loop = (now: number) => {
      if (!rendererRef.current) return;
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      if (isPlaying) incrementTime(dt);
      rendererRef.current.resize(resolution[0], resolution[1]);
      rendererRef.current.render(passes, useStore.getState().time, mouse, useStore.getState().frameCount, dt);
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameRef.current!);
  }, [isPlaying, resolution]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setMouse(e.clientX - rect.left, rect.height - (e.clientY - rect.top), mouse[2], mouse[3]);
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = rect.height - (e.clientY - rect.top);
    setMouse(x, y, x, y);
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = rect.height - (e.clientY - rect.top);
    setMouse(x, y, -Math.abs(mouse[2]), -Math.abs(mouse[3]));
  };

  return (
    <div className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
      <canvas 
        ref={canvasRef}
        className="cursor-crosshair"
        width={resolution[0]}
        height={resolution[1]}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />
      <div className="absolute top-2 left-2 text-xs text-white/50 font-mono pointer-events-none">
        {Math.round(1/0.016)} FPS | GLSL {glslDialect === 'shadertoy' ? '(Shadertoy)' : '(Standard)'} | t={time.toFixed(2)}
      </div>
    </div>
  );
};

export default ShaderCanvas;