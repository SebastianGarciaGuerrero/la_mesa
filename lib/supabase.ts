import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto'; // Supabase en Expo necesita esto a veces

// 1. Leemos las variables del entorno
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// 2. Validación de seguridad (TypeScript te agradecerá esto)
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan las variables de entorno de Supabase en el archivo .env');
}

// 3. Creamos el cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey);