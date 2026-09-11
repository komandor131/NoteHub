import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          style={{
            padding: '32px 24px',
            margin: '24px auto',
            maxWidth: '600px',
            background: '#141419',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            color: '#fff',
            textAlign: 'center',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>
            Виникла тимчасова помилка інтерфейсу
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
            {this.state.error?.message || 'Не вдалося завантажити деякі елементи компонента.'}
          </p>
          <button
            type="button"
            className="btn primary"
            onClick={this.handleReset}
            style={{
              background: 'var(--pink)',
              borderColor: 'var(--pink)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCcw size={14} /> Перезавантажити інтерфейс
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
