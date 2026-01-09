import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '../hooks/use-color-scheme';

// Importamos los dos proveedores
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LeagueProvider } from '../context/LeagueContext';

// Componente auxiliar para manejar la protección de rutas
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // CORRECCIÓN: Eliminamos la línea de '(auth)' que daba error.
    // Solo necesitamos saber si estamos en la pantalla de 'login'.
    const inLogin = segments[0] === 'login';

    if (!session && !inLogin) {
      // 1. Si NO hay usuario y NO estás en login -> Vete al Login
      router.replace('/login');
    } else if (session && inLogin) {
      // 2. Si SÍ hay usuario y estás en login -> Entra a la App
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  return (
    <LeagueProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </LeagueProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}