import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.max2605.stratagemtrainer',
  appName: 'Stratagem Trainer',
  webDir: 'dist',
  android: {
    path: 'android/sourcecode/native',
    backgroundColor: '#101720',
  },
  ios: {
    path: 'iphone/sourcecode/native',
    backgroundColor: '#101720',
    contentInset: 'automatic',
  },
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
};

export default config;
