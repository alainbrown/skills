import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/reset.css';
import '../components/shared.css';
import './options.css';
import { OptionsContainer } from './OptionsContainer';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OptionsContainer />
  </StrictMode>,
);
