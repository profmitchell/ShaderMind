export enum PassType {
  IMAGE = 'image',
  BUFFER = 'buffer',
}

export enum EditorMode {
  SHADER = 'shader',
  P5 = 'p5'
}

export type GlslDialect = 'standard' | 'shadertoy';

export interface ShaderPass {
  id: string;
  name: string;
  type: PassType;
  fragmentShader: string;
  active: boolean;
  inputs: {
    [channel: number]: {
      type: 'pass' | 'texture' | null;
      id: string | null; // Pass ID or Texture ID
    };
  };
  feedback: boolean; // Uses ping-pong buffering
}

export interface ProjectState {
  mode: EditorMode;
  glslDialect: GlslDialect;
  p5Code: string;
  passes: ShaderPass[];
  selectedPassId: string;
  compiled: boolean;
  isPlaying: boolean;
  time: number;
  resolution: [number, number];
  mouse: [number, number, number, number]; // x, y, clickX, clickY
  frameCount: number;
}

export interface AIAction {
  type: "SET_SHADER_CODE" | "CREATE_PASS" | "DELETE_PASS" | "SET_CONNECTION" | "SET_FEEDBACK" | "SELECT_PASS" | "SET_P5_CODE" | "SET_GLSL_DIALECT";
  payload: any;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  attachments?: string[]; // Base64 Data URIs (images or videos)
  timestamp: number;
}