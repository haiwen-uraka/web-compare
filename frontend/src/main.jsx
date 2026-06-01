import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './contexts/ToastContext'
import { BeginnerModeProvider } from './contexts/BeginnerModeContext'
import { DarkModeProvider } from './contexts/DarkModeContext'
import App from './App'
import './index.css'
import './i18n'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DarkModeProvider>
        <BeginnerModeProvider>
          <ToastProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ToastProvider>
        </BeginnerModeProvider>
      </DarkModeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
