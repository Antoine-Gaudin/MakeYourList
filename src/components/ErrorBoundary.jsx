import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[200px]">
          <AlertTriangle size={32} className="text-amber-400" />
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">Une erreur est survenue</h3>
            <p className="text-sm text-muted-foreground">Cette section a rencontré un problème.</p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/15 text-primary text-sm font-medium border-none cursor-pointer hover:bg-primary/25 transition-colors"
          >
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
