import { GoogleGenAI } from "@google/genai";
import { ProjectState, AIAction, EditorMode, ChatMessage } from "../types";

const SYSTEM_INSTRUCTION_SHADER = `
You are a senior Graphics Engineer and Shader Copilot.
You help users write GLSL ES 3.00 shaders for a multi-pass renderer.

THE PROTOCOL:
Respond with JSON: { "message": "explanation", "actions": [] }

AVAILABLE ACTIONS:
- { "type": "CREATE_PASS", "payload": { "name": "string", "feedback": boolean } }
- { "type": "DELETE_PASS", "payload": { "pass": "PassNameOrID" } }
- { "type": "SET_SHADER_CODE", "payload": { "pass": "PassNameOrID", "code": "full glsl code" } }
- { "type": "SET_CONNECTION", "payload": { "pass": "TargetPassName", "channel": number (0-3), "source": "SourcePassName" } }
- { "type": "SET_FEEDBACK", "payload": { "pass": "PassName", "enabled": boolean } }
- { "type": "SELECT_PASS", "payload": { "pass": "PassName" } }
- { "type": "SET_GLSL_DIALECT", "payload": { "dialect": "standard" | "shadertoy" } }

CONTEXT:
- GLSL ES 3.00. Uniforms: iResolution, iTime, iTimeDelta, iFrame, iMouse, iChannel0..3.
- Output: 'out vec4 fragColor'.
- Image/Video analysis: If media is provided, create a procedural shader mimicking its style, motion, or patterns.

DIALECTS:
- Standard: Uses 'void main() { ... }'.
- Shadertoy: Uses 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { ... }'. 
- If the user asks for "Shadertoy" or provides Shadertoy code, switch dialect to "shadertoy".

WORKFLOW: COMBINING / MASHING SHADERS
If the user provides multiple shader code blocks or asks to combine effects:
1. Analyze the aesthetic and technical DNA of each input (e.g., "fluid motion", "neon palette", "geometric sdf", "fractal nature").
2. DO NOT just overlay them or mix them 50/50.
3. Create a BRAND NEW, DISTINCT shader that synthesizes these traits into something unique.
4. "Mash" them together: Use the color palette of Shader A to render the geometry of Shader B, or warp the space of Shader A using the motion logic of Shader B.
5. Rename conflicting functions (e.g., mapA, mapB) if preserving logic, but prefer rewriting into a cohesive whole.
6. The goal is a new piece of art influenced by the inputs, not a utility blend.
`;

const SYSTEM_INSTRUCTION_P5 = `
You are a Creative Coding Expert using p5.js.
You help users create interactive, generative art in JavaScript.

THE PROTOCOL:
Respond with JSON: { "message": "explanation", "actions": [] }

AVAILABLE ACTIONS:
- { "type": "SET_P5_CODE", "payload": { "code": "full javascript code" } }

CONTEXT:
- Code must be valid p5.js instance mode or global mode compatible (we use global mode in sandbox).
- Functions: setup(), draw().
- Use windowWidth, windowHeight for canvas size.
- Image/Video analysis: If media is provided, write p5.js code to recreate the style using shapes, colors, and algorithms.
`;

export const sendMessageToGemini = async (
  history: ChatMessage[],
  currentState: ProjectState
): Promise<{ message: string; actions: AIAction[] }> => {
  if (!process.env.API_KEY) {
    return {
      message: "API Key is missing. Please check your environment configuration.",
      actions: []
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isP5 = currentState.mode === EditorMode.P5;

  // Prepare the context string describing the CURRENT state of the project
  let contextString = "";
  if (isP5) {
     contextString = `\n\n[CURRENT PROJECT STATE]\nMode: P5.js\nCurrent Code:\n${currentState.p5Code}\n`;
  } else {
     const stateSummary = currentState.passes.map(p => 
      `Pass: ${p.name} (${p.type}), ID: ${p.id}, Feedback: ${p.feedback}, Inputs: ${JSON.stringify(p.inputs)}\nCode:\n${p.fragmentShader}`
    ).join('\n---\n');
    contextString = `\n\n[CURRENT PROJECT STATE]\nMode: Shader (GLSL)\nDialect: ${currentState.glslDialect}\n${stateSummary}\n`;
  }

  // Build contents from history
  const contents = history.map((msg, index) => {
    const parts: any[] = [];
    
    // Add text
    // If it's the LAST message (current user request), inject the context
    let text = msg.text;
    if (index === history.length - 1 && msg.role === 'user') {
      text = `${text}\n${contextString}`;
    }
    parts.push({ text });

    // Add attachments
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach((dataUri) => {
        const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      });
    }

    return {
      role: msg.role,
      parts: parts
    };
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: isP5 ? SYSTEM_INSTRUCTION_P5 : SYSTEM_INSTRUCTION_SHADER,
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Empty response");

    const parsed = JSON.parse(responseText);
    return parsed;
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      message: "I encountered an error processing your request. Please try again.",
      actions: []
    };
  }
};