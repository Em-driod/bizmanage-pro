import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  isProcessing?: boolean;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onCredential, isProcessing = false }) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(isProcessing);
  processingRef.current = isProcessing;

  useEffect(() => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || !buttonRef.current) return;

    let cancelled = false;

    const render = () => {
      if (cancelled || !window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (processingRef.current) return;
          onCredential(response.credential);
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        shape: 'pill',
      });
    };

    if (window.google) {
      render();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          render();
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  return (
    <div className="relative flex justify-center">
      <div ref={buttonRef} className={isProcessing ? 'pointer-events-none opacity-50' : ''} />
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default GoogleSignInButton;
