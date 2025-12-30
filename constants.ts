import { ShaderPass, PassType } from './types';

export const VERTEX_SHADER_DEFAULT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

export const DEFAULT_IMAGE_SHADER = `#version 300 es
precision highp float;

uniform vec3 iResolution;
uniform float iTime;
uniform sampler2D iChannel0;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    
    // Default gradient
    vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
    
    // If Channel0 is connected, mix it in (example)
    vec4 ch0 = texture(iChannel0, uv);
    if(ch0.a > 0.0) {
        col = mix(col, ch0.rgb, 0.5);
    }
    
    fragColor = vec4(col, 1.0);
}`;

export const DEFAULT_SHADERTOY_CODE = `// Shadertoy "Image" shader
// Inputs: iResolution, iTime, iMouse, iChannel0...3
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;

    // Time varying pixel color
    vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));

    // Output to screen
    fragColor = vec4(col,1.0);
}`;

export const SHADERTOY_PRELUDE = `#version 300 es
precision highp float;

uniform vec3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform float iFrame;
uniform vec4 iMouse;
uniform vec4 iDate;
uniform float iSampleRate;
uniform vec3 iChannelResolution[4];

uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;

out vec4 fragColor;

// Compatibility defines
#define texture2D texture
`;

export const SHADERTOY_SUFFIX = `
void main() {
    mainImage(fragColor, gl_FragCoord.xy);
    fragColor.a = 1.0; // Force alpha to 1 for screen
}
`;

export const DEFAULT_BUFFER_SHADER = `#version 300 es
precision highp float;

uniform vec3 iResolution;
uniform float iTime;
uniform int iFrame;
uniform vec4 iMouse;
uniform sampler2D iChannel0; // Often self-feedback

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    
    // Simple feedback fade
    // Requires Feedback=true and Channel0=Self
    vec4 prev = texture(iChannel0, uv);
    
    // Draw a circle at mouse
    float d = length(gl_FragCoord.xy - iMouse.xy);
    float brush = smoothstep(20.0, 5.0, d);
    
    vec3 col = prev.rgb * 0.99; // Decay
    col += vec3(brush);
    
    fragColor = vec4(col, 1.0);
}`;

export const DEFAULT_P5_CODE = `function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
}

function draw() {
  // Semi-transparent background for trails
  background(0, 20);
  
  noFill();
  strokeWeight(2);
  
  // Calculate color based on time and position
  let t = millis() * 0.001;
  let r = map(sin(t), -1, 1, 100, 255);
  let g = map(cos(t * 1.5), -1, 1, 100, 255);
  let b = map(sin(t * 2), -1, 1, 200, 255);
  
  stroke(r, g, b);
  
  // Draw a spirograph pattern at the mouse or center
  translate(mouseX || width/2, mouseY || height/2);
  
  beginShape();
  for (let i = 0; i < 360; i += 10) {
    let rad = radians(i);
    let radius = 100 + 50 * sin(t * 5 + rad * 5);
    let x = radius * cos(rad);
    let y = radius * sin(rad);
    vertex(x, y);
  }
  endShape(CLOSE);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(0);
}`;

export const INITIAL_PASSES: ShaderPass[] = [
  {
    id: 'image_pass',
    name: 'Image',
    type: PassType.IMAGE,
    fragmentShader: DEFAULT_IMAGE_SHADER,
    active: true,
    inputs: { 0: { type: null, id: null }, 1: { type: null, id: null }, 2: { type: null, id: null }, 3: { type: null, id: null } },
    feedback: false,
  }
];