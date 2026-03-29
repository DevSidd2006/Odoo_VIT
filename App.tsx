import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { initDatabase } from './src/db/database';
import { Colors } from './src/theme';

type ErrorBoundaryState = { hasError: boolean; message: string };

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message ?? 'Unexpected runtime error.' };
  }

  componentDidCatch(error: Error) {
    console.error('[App] Runtime render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Runtime Error</Text>
          <Text style={styles.errorMsg}>{this.state.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((e: Error) => {
        console.error('[App] DB init failed:', e);
        setDbError(e.message);
      });
  }, []);

  if (dbError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorTitle}>Database Error</Text>
        <Text style={styles.errorMsg}>{dbError}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent.primary} />
        <Text style={styles.loadingText}>Starting up...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <RootErrorBoundary>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </RootErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorIcon: { fontSize: 36, marginBottom: 12, color: Colors.status.error },
  errorTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.primary, marginBottom: 8 },
  errorMsg: { fontSize: 14, color: Colors.status.error, textAlign: 'center' },
  loadingText: { fontSize: 14, color: Colors.text.secondary, marginTop: 12 },
});
