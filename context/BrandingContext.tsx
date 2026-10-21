import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from './AuthContext';

export interface Branding {
  name: string;
  logoImage: string | null;
  accentColor: string;
  slug: string | null;
  isPublic: boolean;
  hasBankDetails: boolean;
}

interface BrandingContextType {
  branding: Branding;
  // True once the server answered (or failed) — avoids flashing initials before a logo loads.
  loaded: boolean;
  refresh: () => Promise<void>;
  // Apply a change locally right away (e.g. after uploading a new logo).
  update: (patch: Partial<Branding>) => void;
}

const DEFAULT_ACCENT = '#6366f1';

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// One source of truth for the business's name, logo and colour, so the sidebar,
// invoices, receipts and settings all show the same thing and update together.
export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const fallback = useCallback(
    (): Branding => ({
      name: user?.businessName || 'My Business',
      logoImage: null,
      accentColor: DEFAULT_ACCENT,
      slug: null,
      isPublic: false,
      hasBankDetails: false,
    }),
    [user?.businessName],
  );
  const [branding, setBranding] = useState<Branding>(fallback);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await apiRequest<Partial<Branding>>('/businesses/me/branding');
      setBranding({
        name: data.name || user?.businessName || 'My Business',
        logoImage: data.logoImage || null,
        accentColor: data.accentColor || DEFAULT_ACCENT,
        slug: data.slug ?? null,
        isPublic: !!data.isPublic,
        hasBankDetails: !!data.hasBankDetails,
      });
    } catch {
      // Older server or offline — keep the name from the login session.
      setBranding((b) => ({ ...b, name: user?.businessName || b.name }));
    } finally {
      setLoaded(true);
    }
  }, [isAuthenticated, user?.businessName]);

  useEffect(() => {
    if (!isAuthenticated) {
      setBranding(fallback());
      setLoaded(false);
      return;
    }
    refresh();
  }, [isAuthenticated, user?.businessId, refresh, fallback]);

  const update = useCallback((patch: Partial<Branding>) => setBranding((b) => ({ ...b, ...patch })), []);

  return (
    <BrandingContext.Provider value={{ branding, loaded, refresh, update }}>{children}</BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within a BrandingProvider');
  return ctx;
};
