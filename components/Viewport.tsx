import React from 'react';
import { useStore } from '../store';
import { EditorMode } from '../types';
import ShaderCanvas from './ShaderCanvas';
import P5Canvas from './P5Canvas';

const Viewport: React.FC = () => {
  const { mode } = useStore();

  return (
    <>
      {mode === EditorMode.SHADER ? <ShaderCanvas /> : <P5Canvas />}
    </>
  );
};

export default Viewport;