import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
// Usamos Ionicons que viene instalado por defecto en Expo
import { Ionicons } from '@expo/vector-icons';
// Ruta relativa corregida para el hook de color
import { useColorScheme } from '../../hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  // Definimos colores aquí mismo para evitar errores de importación
  const activeColor = colorScheme === 'dark' ? '#4ade80' : '#1e3a8a'; // Verde neón o Azul oscuro

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        headerShown: false,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}>

      {/* 1. HOME (Tabla) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tabla',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="list" color={color} />,
        }}
      />

      {/* 2. GOLEADORES */}
      <Tabs.Screen
        name="goleadores"
        options={{
          title: 'Goleadores',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="football" color={color} />,
        }}
      />

      {/* 3. ADMIN (Planilla) */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Planilla',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="create" color={color} />,
        }}
      />

      {/* 4. GESTIÓN (Crear cosas) */}
      <Tabs.Screen
        name="gestion"
        options={{
          title: 'Gestión',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}