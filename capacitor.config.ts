import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.liquidlift.Morniy',
  appName: 'Morniy',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false, // disallow HTTP content in HTTPS app — required for Play Store
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#4F46E5',
      showSpinner: false,
    },
  },
};

export default config;
