import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

// Definimos la forma de los datos según la vista 'top_scorers' que creamos en SQL
interface Scorer {
    player_id: number;
    name: string;
    nickname: string;
    total_goals: number;
    default_team_name: string;
}

export default function GoleadoresScreen() {
    const [scorers, setScorers] = useState<Scorer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function fetchScorers() {
        try {
            // Consultamos la vista mágica que suma los goles sola
            const { data, error } = await supabase
                .from('top_scorers')
                .select('*')
                .order('total_goals', { ascending: false }) // Ordenar de mayor a menor
                .limit(20); // Top 20 para no saturar

            if (error) throw error;
            setScorers(data || []);
        } catch (error) {
            console.error('Error cargando goleadores:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            fetchScorers();
        }, [])
    );

    const renderItem = ({ item, index }: { item: Scorer; index: number }) => (
        <View style={styles.row}>
            {/* Posición (1, 2, 3...) */}
            <View style={styles.posContainer}>
                {index < 3 ? (
                    // Un pequeño toque visual para los top 3
                    <Text style={styles.medal}>{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</Text>
                ) : (
                    <Text style={styles.posText}>{index + 1}</Text>
                )}
            </View>

            {/* Info del Jugador */}
            <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{item.name}</Text>
                <Text style={styles.teamName}>{item.default_team_name || 'Agente Libre'}</Text>
            </View>

            {/* Goles */}
            <View style={styles.goalsContainer}>
                <Text style={styles.goalsText}>{item.total_goals}</Text>
                <Text style={styles.goalsLabel}>goles</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Artilleros 👟⚽</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#d32f2f" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={scorers}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.player_id.toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchScorers} />}
                    ListEmptyComponent={<Text style={styles.empty}>Aún no hay goles gritados</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
    title: { fontSize: 26, fontWeight: '900', marginBottom: 20, textAlign: 'center', color: '#1a1a1a', letterSpacing: -1 },
    row: {
        flexDirection: 'row',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center'
    },
    posContainer: { width: 40, alignItems: 'center', justifyContent: 'center' },
    posText: { fontSize: 16, fontWeight: 'bold', color: '#888' },
    medal: { fontSize: 24 },
    playerInfo: { flex: 1, paddingHorizontal: 15 },
    playerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    teamName: { fontSize: 13, color: '#666', marginTop: 2 },
    goalsContainer: { alignItems: 'flex-end', minWidth: 50 },
    goalsText: { fontSize: 18, fontWeight: '900', color: '#d32f2f' },
    goalsLabel: { fontSize: 10, color: '#d32f2f', fontWeight: 'bold' },
    empty: { textAlign: 'center', marginTop: 40, color: '#999', fontSize: 16 }
});