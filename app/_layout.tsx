import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { ConsultationProvider } from '../src/providers/ConsultationProvider';

export default function RootLayout() {
  return (
    <ConsultationProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="scanner" />
      </Stack>
      <StatusBar style="dark" />
    </ConsultationProvider>
  );
}
