import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { initDatabase } from './src/db/database';
import { Colors } from './src/theme';
import { View as RNView, Text as RNText, ActivityIndicator as RNActivityIndicator } from 'react-native';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch(e => {
        console.error('[App] DB init failed:', e);
        setDbError(e.message);
      });
  }, []);

  if (dbError) {
    return (
      <RNView style={styles.center}>
        <RNText style={styles.errorIcon}>⚠️</RNText>
        <RNText style={styles.errorTitle}>Database Error</RNText>
        <RNText style={styles.errorMsg}>{dbError}</RNText>
      </RNView>
    );
  }

  if (!dbReady) {
    return (
      <RNView style={styles.center}>
        <RNActivityIndicator size="large" color="#6C63FF" />
        <RNText style={styles.loadingText}>Starting up...</RNText>
      </RNView>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#F0F0FF', marginBottom: 8 },
  errorMsg: { fontSize: 14, color: '#EF4444', textAlign: 'center' },
  loadingText: { fontSize: 14, color: '#9090B0', marginTop: 12 },
});
