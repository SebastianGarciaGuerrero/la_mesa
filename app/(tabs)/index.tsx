import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLeague } from '../../context/LeagueContext';
import { supabase } from '../../lib/supabase';

// Tipos
interface League { id: number; name: string; created_by: string; }
interface Standing { team_id: number; team_name: string; played: number; points: number; gd: number; }

export default function HomeScreen() {
  const { leagueId, changeLeague, refreshLeagues } = useLeague();
  const { user, signOut } = useAuth(); // Agregamos SignOut para poder cerrar sesión

  // Estados
  const [viewMode, setViewMode] = useState<'dashboard' | 'league'>('dashboard');
  const [myLeagues, setMyLeagues] = useState<League[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar Ligas al iniciar
  useFocusEffect(
    useCallback(() => {
      fetchMyLeagues();
    }, [user])
  );

  // Efecto: Si cambia la liga seleccionada, cargamos la tabla
  useEffect(() => {
    if (leagueId && viewMode === 'league') {
      fetchStandings();
    }
  }, [leagueId, viewMode]);

  async function fetchMyLeagues() {
    if (!user) return;
    setLoading(true);
    // Traer ligas creadas por mí (o todas si quieres ver todo)
    // Aquí filtramos por "created_by" para que sea personal
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .eq('created_by', user.id)
      .eq('is_active', true);

    if (data) setMyLeagues(data);
    setLoading(false);
  }

  async function fetchStandings() {
    setLoading(true);
    const { data } = await supabase
      .from('standings')
      .select('*')
      .eq('tournament_id', leagueId)
      .order('points', { ascending: false })
      .order('gd', { ascending: false });

    if (data) setStandings(data);
    setLoading(false);
  }

  function enterLeague(league: League) {
    changeLeague(league.id, league.name);
    setViewMode('league');
  }

  function exitLeague() {
    setViewMode('dashboard');
  }

  // --- VISTA 1: DASHBOARD (MIS LIGAS) ---
  if (viewMode === 'dashboard') {
    return (
      <View style={styles.container}>
        <View style={styles.headerDashboard}>
          <View>
            <Text style={styles.welcomeText}>Hola, Profe 👋</Text>
            <Text style={styles.subWelcome}>Tus torneos activos</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

        <FlatList
          data={myLeagues}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tienes ligas creadas.</Text>
              <Text style={styles.emptySub}>Ve a la pestaña Gestión para crear tu primera liga.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.leagueCard} onPress={() => enterLeague(item)}>
              <View style={styles.iconContainer}>
                <Text style={{ fontSize: 30 }}>🏆</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.leagueName}>{item.name}</Text>
                <Text style={styles.leagueRole}>Administrador</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  // --- VISTA 2: TABLA DE POSICIONES (ADENTRO DE LA LIGA) ---
  return (
    <View style={styles.container}>
      {/* Header Liga */}
      <View style={styles.headerLeague}>
        <TouchableOpacity onPress={exitLeague} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.leagueTitle}>{myLeagues.find(l => l.id === leagueId)?.name || 'Tabla'}</Text>
        <TouchableOpacity onPress={fetchStandings}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.th, { flex: 0.5, textAlign: 'center' }]}>#</Text>
        <Text style={[styles.th, { flex: 3 }]}>Equipo</Text>
        <Text style={[styles.th, { textAlign: 'center' }]}>PJ</Text>
        <Text style={[styles.th, { textAlign: 'center' }]}>DG</Text>
        <Text style={[styles.th, { textAlign: 'center', fontWeight: '900', color: '#000' }]}>PTS</Text>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 50 }} size="large" /> : (
        <FlatList
          data={standings}
          keyExtractor={(item) => item.team_id.toString()}
          refreshControl={<RefreshControl refreshing={false} onRefresh={fetchStandings} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#888' }}>Aún no hay partidos jugados.</Text>}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <Text style={[styles.cell, { flex: 0.5, fontWeight: 'bold', textAlign: 'center', color: index < 3 ? '#2563eb' : '#666' }]}>{index + 1}</Text>
              <Text style={[styles.cell, { flex: 3, fontWeight: '600' }]}>{item.team_name}</Text>
              <Text style={[styles.cell, { textAlign: 'center' }]}>{item.played}</Text>
              <Text style={[styles.cell, { textAlign: 'center' }]}>{item.gd}</Text>
              <Text style={[styles.cell, { textAlign: 'center', fontWeight: 'bold', fontSize: 16 }]}>{item.points}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  // Dashboard Styles
  headerDashboard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, paddingTop: 60, backgroundColor: 'white' },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  subWelcome: { color: '#666', marginTop: 2 },
  logoutBtn: { padding: 10, backgroundColor: '#fee2e2', borderRadius: 10 },

  leagueCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  iconContainer: { width: 60, height: 60, backgroundColor: '#eff6ff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  leagueName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  leagueRole: { fontSize: 12, color: '#2563eb', fontWeight: '600', marginTop: 4 },

  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 10 },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 40 },

  // League View Styles
  headerLeague: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#1e3a8a' },
  leagueTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  backButton: { padding: 5 },

  tableHeader: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, backgroundColor: '#e5e7eb', borderBottomWidth: 1, borderColor: '#d1d5db' },
  th: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#6b7280' },

  row: { flexDirection: 'row', paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: 1, borderColor: '#f3f4f6', backgroundColor: 'white', alignItems: 'center' },
  cell: { flex: 1, fontSize: 14, color: '#374151' }
});