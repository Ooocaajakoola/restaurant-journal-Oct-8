import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { repositories } from './data';
import { RepositoryProvider } from './hooks/useRepositories';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RepositoryProvider repositories={repositories}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RepositoryProvider>
  </StrictMode>,
);
