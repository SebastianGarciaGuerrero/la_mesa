import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);

    // Campos del Formulario
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Lógica de Autenticación
    async function handleAuth() {
        setLoading(true);

        try {
            if (isRegistering) {
                // --- VALIDACIONES DE REGISTRO ---
                if (!email || !password || !username || !confirmPassword) {
                    Alert.alert('Faltan datos', 'Por favor completa todos los campos.');
                    setLoading(false);
                    return;
                }

                if (password !== confirmPassword) {
                    Alert.alert('Error', 'Las contraseñas no coinciden.');
                    setLoading(false);
                    return;
                }

                if (password.length < 6) {
                    Alert.alert('Seguridad', 'La contraseña debe tener al menos 6 caracteres.');
                    setLoading(false);
                    return;
                }

                // --- REGISTRO EN SUPABASE ---
                // Enviamos el username en "data" para que el Trigger de SQL lo capture
                const { error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            username: username,
                        },
                    },
                });

                if (error) {
                    if (error.message.includes('unique constraint')) {
                        throw new Error('Ese nombre de usuario ya está ocupado. Intenta otro.');
                    }
                    throw error;
                }

                Alert.alert('¡Bienvenido a bordo!', 'Cuenta creada exitosamente. Revisa tu correo si es necesario.');
                // Opcional: Auto-login o pedir confirmación depende de tu config de Supabase

            } else {
                // --- LOGIN NORMAL ---
                if (!email || !password) {
                    Alert.alert('Error', 'Ingresa correo y contraseña');
                    setLoading(false);
                    return;
                }

                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.emoji}>⚽🔥</Text>
                    <Text style={styles.title}>LIGA GALAXIAS</Text>
                    <Text style={styles.subtitle}>La mejor app para gestionar tu fútbol.</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.formTitle}>
                        {isRegistering ? 'Crear Nueva Cuenta' : 'Iniciar Sesión'}
                    </Text>

                    {/* Campo USUARIO (Solo Registro) */}
                    {isRegistering && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Nombre de Usuario (Único)</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="person" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    value={username}
                                    onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, ''))} // Forzamos minúsculas y sin espacios
                                    placeholder="ej: el_bicho7"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>
                    )}

                    {/* Campo CORREO */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Correo Electrónico</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail" size={20} color="#666" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="tu@correo.com"
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    {/* Campo CONTRASEÑA */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Contraseña</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed" size={20} color="#666" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="******"
                                secureTextEntry
                            />
                        </View>
                    </View>

                    {/* Campo CONFIRMAR CONTRASEÑA (Solo Registro) */}
                    {isRegistering && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Repetir Contraseña</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="shield-checkmark" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="******"
                                    secureTextEntry
                                />
                            </View>
                        </View>
                    )}

                    <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {isRegistering ? 'REGISTRARME' : 'ENTRAR'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Toggle entre Login y Registro */}
                    <View style={styles.footerParams}>
                        <Text style={{ color: '#666' }}>
                            {isRegistering ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
                        </Text>
                        <TouchableOpacity onPress={() => {
                            setIsRegistering(!isRegistering);
                            // Limpiamos errores o campos al cambiar
                            setPassword('');
                            setConfirmPassword('');
                        }}>
                            <Text style={styles.switchText}>
                                {isRegistering ? ' Ingresa aquí' : ' Regístrate gratis'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' }, // Fondo oscuro moderno
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    header: { alignItems: 'center', marginBottom: 30 },
    emoji: { fontSize: 40, marginBottom: 10 },
    title: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 1 },
    subtitle: { color: '#9ca3af', fontSize: 16 },

    card: { backgroundColor: 'white', borderRadius: 20, padding: 25, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
    formTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 20, textAlign: 'center' },

    inputContainer: { marginBottom: 15 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 5 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f9fafb', paddingHorizontal: 10 },
    icon: { marginRight: 10 },
    input: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#111' },

    button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, shadowColor: '#2563eb', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },

    footerParams: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    switchText: { color: '#2563eb', fontWeight: 'bold' }
});