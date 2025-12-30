import { create } from 'zustand';
import { ProjectState, ShaderPass, PassType, AIAction, EditorMode, GlslDialect } from './types';
import { INITIAL_PASSES, DEFAULT_BUFFER_SHADER, DEFAULT_P5_CODE, DEFAULT_SHADERTOY_CODE, DEFAULT_IMAGE_SHADER } from './constants';
import { v4 as uuidv4 } from 'uuid';

interface AppStore extends ProjectState {
  setMode: (mode: EditorMode) => void;
  setGlslDialect: (dialect: GlslDialect) => void;
  setP5Code: (code: string) => void;
  setResolution: (w: number, h: number) => void;
  setMouse: (x: number, y: number, cx: number, cy: number) => void;
  incrementTime: (dt: number) => void;
  togglePlay: () => void;
  selectPass: (id: string) => void;
  updatePassCode: (id: string, code: string) => void;
  addPass: (name?: string, feedback?: boolean) => void;
  deletePass: (id: string) => void;
  setPassInput: (passId: string, channel: number, sourceId: string | null) => void;
  setPassFeedback: (passId: string, enabled: boolean) => void;
  applyAIAction: (action: AIAction) => void;
  loadProject: (project: ProjectState) => void;
}

export const useStore = create<AppStore>((set, get) => ({
  mode: EditorMode.SHADER,
  glslDialect: 'standard',
  p5Code: DEFAULT_P5_CODE,
  passes: INITIAL_PASSES,
  selectedPassId: 'image_pass',
  compiled: true,
  isPlaying: true,
  time: 0,
  resolution: [800, 600],
  mouse: [0, 0, -1, -1],
  frameCount: 0,

  setMode: (mode) => set({ mode }),
  
  setGlslDialect: (dialect) => set((state) => {
    // When switching dialects, we optionally reset the code of the main image pass to a template
    // to prevent immediate confusion, or we leave it. 
    // For a smoother UX, let's update the Image pass if it's the default one.
    const newPasses = state.passes.map(p => {
       if (p.type === PassType.IMAGE) {
         if (dialect === 'shadertoy' && p.fragmentShader.includes('void main()')) {
            return { ...p, fragmentShader: DEFAULT_SHADERTOY_CODE };
         } else if (dialect === 'standard' && p.fragmentShader.includes('void mainImage')) {
            return { ...p, fragmentShader: DEFAULT_IMAGE_SHADER };
         }
       }
       return p;
    });
    return { glslDialect: dialect, passes: newPasses };
  }),

  setP5Code: (code) => set({ p5Code: code }),
  setResolution: (w, h) => set({ resolution: [w, h] }),
  setMouse: (x, y, cx, cy) => set({ mouse: [x, y, cx, cy] }),
  incrementTime: (dt) => set((state) => ({ 
    time: state.time + dt,
    frameCount: state.frameCount + 1 
  })),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  selectPass: (id) => set({ selectedPassId: id }),
  
  updatePassCode: (id, code) => set((state) => ({
    passes: state.passes.map(p => p.id === id ? { ...p, fragmentShader: code } : p)
  })),

  addPass: (name, feedback = false) => set((state) => {
    const newId = uuidv4();
    const newPass: ShaderPass = {
      id: newId,
      name: name || `Buffer ${state.passes.length}`,
      type: PassType.BUFFER,
      fragmentShader: state.glslDialect === 'shadertoy' ? DEFAULT_SHADERTOY_CODE : DEFAULT_BUFFER_SHADER,
      active: true,
      inputs: { 0: { type: null, id: null }, 1: { type: null, id: null }, 2: { type: null, id: null }, 3: { type: null, id: null } },
      feedback: feedback
    };
    // Insert before Image pass
    const imagePassIndex = state.passes.findIndex(p => p.type === PassType.IMAGE);
    const newPasses = [...state.passes];
    newPasses.splice(imagePassIndex, 0, newPass);
    return { passes: newPasses, selectedPassId: newId };
  }),

  deletePass: (id) => set((state) => {
    if (id === 'image_pass') return state; // Cannot delete image pass
    return { 
      passes: state.passes.filter(p => p.id !== id),
      selectedPassId: state.selectedPassId === id ? 'image_pass' : state.selectedPassId
    };
  }),

  setPassInput: (passId, channel, sourceId) => set((state) => ({
    passes: state.passes.map(p => {
      if (p.id !== passId) return p;
      const newInputs = { ...p.inputs };
      newInputs[channel] = { type: sourceId ? 'pass' : null, id: sourceId };
      return { ...p, inputs: newInputs };
    })
  })),

  setPassFeedback: (passId, enabled) => set((state) => ({
    passes: state.passes.map(p => p.id === passId ? { ...p, feedback: enabled } : p)
  })),

  loadProject: (project) => set({
    mode: project.mode || EditorMode.SHADER,
    glslDialect: project.glslDialect || 'standard',
    p5Code: project.p5Code || DEFAULT_P5_CODE,
    passes: project.passes,
    selectedPassId: project.selectedPassId,
    time: 0,
    frameCount: 0
  }),

  applyAIAction: (action) => {
    const state = get();
    console.log("Applying AI Action:", action);
    switch (action.type) {
      case "SET_GLSL_DIALECT":
        state.setGlslDialect(action.payload.dialect);
        break;
      case "SET_P5_CODE":
        state.setP5Code(action.payload.code);
        break;
      case "CREATE_PASS":
        state.addPass(action.payload.name, action.payload.feedback);
        break;
      case "SET_SHADER_CODE":
        let targetId = action.payload.pass;
        const p = state.passes.find(pass => pass.name === action.payload.pass || pass.id === action.payload.pass);
        if (p) state.updatePassCode(p.id, action.payload.code);
        break;
      case "SET_CONNECTION":
        const targetPass = state.passes.find(pass => pass.name === action.payload.pass || pass.id === action.payload.pass);
        const sourcePass = state.passes.find(pass => pass.name === action.payload.source || pass.id === action.payload.source);
        if (targetPass) {
           let srcId = sourcePass ? sourcePass.id : null;
           state.setPassInput(targetPass.id, action.payload.channel, srcId);
        }
        break;
      case "SET_FEEDBACK":
        const fPass = state.passes.find(pass => pass.name === action.payload.pass || pass.id === action.payload.pass);
        if (fPass) state.setPassFeedback(fPass.id, action.payload.enabled);
        break;
      case "SELECT_PASS":
        const sPass = state.passes.find(pass => pass.name === action.payload.pass || pass.id === action.payload.pass);
        if(sPass) state.selectPass(sPass.id);
        break;
      case "DELETE_PASS":
         const dPass = state.passes.find(pass => pass.name === action.payload.pass || pass.id === action.payload.pass);
         if(dPass) state.deletePass(dPass.id);
         break;
    }
  }
}));