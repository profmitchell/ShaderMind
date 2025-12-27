import { GoogleGenAI } from "@google/genai";
import { ProjectState, AIAction, EditorMode } from "../types";

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

CONTEXT:
- GLSL ES 3.00. Uniforms: iResolution, iTime, iTimeDelta, iFrame, iMouse, iChannel0..3.
- Output: 'out vec4 fragColor'.
- Image analysis: If image provided, create a procedural shader mimicking it.
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
- Image analysis: If image provided, write p5.js code to recreate the style using shapes, colors, and algorithms.
`;

export const sendMessageToGemini = async (
  prompt: string,
  images: string[],
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

  let context = "";
  if (isP5) {
     context = `Current P5 Code:\n${currentState.p5Code}\nUser Request: ${prompt || "Analyze the attached image and create a P5 sketch inspired by it."}`;
  } else {
     const stateSummary = currentState.passes.map(p => 
      `Pass: ${p.name} (${p.type}), ID: ${p.id}, Feedback: ${p.feedback}, Inputs: ${JSON.stringify(p.inputs)}`
    ).join('\n');
    context = `Current Project State:\n${stateSummary}\nUser Request: ${prompt || "Analyze the attached image and create a shader inspired by it."}`;
  }

  // Build the content parts
  const parts: any[] = [{ text: context }];

  // Append images if present
  if (images && images.length > 0) {
    images.forEach((base64Data) => {
      const base64 = base64Data.split(',')[1] || base64Data;
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: base64
        }
      });
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
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