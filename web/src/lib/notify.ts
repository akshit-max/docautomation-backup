"use client";

export type ToastType = 'success' | 'loading' | 'error' | 'warning' | 'info';

export interface NotifyOptions {
  id?: string | number;
  duration?: number; // 0 for infinite (loading), default 4000
  details?: string;  // Expandable technical details for developers
}

class NotifyService {
  private dispatch(type: ToastType, message: string, options?: NotifyOptions): string | number {
    const id = options?.id ?? (Date.now() + Math.random());
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('show-toast', {
        detail: { 
          id, 
          type, 
          message, 
          duration: options?.duration, 
          details: options?.details 
        }
      });
      window.dispatchEvent(event);
    }
    return id;
  }

  success(message: string, options?: NotifyOptions) {
    return this.dispatch('success', message, { duration: 4000, ...options });
  }

  loading(message: string, options?: NotifyOptions) {
    return this.dispatch('loading', message, { duration: 0, ...options });
  }

  error(message: string, options?: NotifyOptions) {
    let friendlyMessage = message;
    let details = options?.details;

    // Convert technical/billing errors into user-friendly notifications with details
    if (message.includes('402') || message.includes('Payment Required') || message.includes('credits') || message.includes('afford')) {
      friendlyMessage = "Translation couldn't be completed because the AI service is currently unavailable.";
      details = details || message;
    } else if (message.includes('500') || message.includes('Internal Server Error') || message.includes('Failed to fetch')) {
      friendlyMessage = "An unexpected error occurred while communicating with the service.";
      details = details || message;
    }

    return this.dispatch('error', friendlyMessage, { duration: 6500, details, ...options });
  }

  warning(message: string, options?: NotifyOptions) {
    return this.dispatch('warning', message, { duration: 5000, ...options });
  }

  info(message: string, options?: NotifyOptions) {
    return this.dispatch('info', message, { duration: 4000, ...options });
  }

  dismiss(id: string | number) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dismiss-toast', { detail: { id } }));
    }
  }
}

export const notify = new NotifyService();
