import { Ionicons } from '@expo/vector-icons'; // Iconos para el checklist
import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLeague } from '../../context/LeagueContext';
import { supabase } from '../../lib/supabase';

export default function GestionScreen() {
    const { leagueId, leagueName, refreshLeagues } = useLeague();
    const [activeTab, setActiveTab] = useState<'equipos' | 'jugadores' | 'ligas'>('ligas'); // Arrancamos en Ligas para configurar
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    // Datos Globales
    const [teams, setTeams] = useState<any[]>([]);

    // Formularios Básicos
    const [teamName, setTeamName] = useState('');
    const [teamShield, setTeamShield] = useState('🛡️');
    const [playerName, setPlayerName] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [newLeagueName, setNewLeagueName] = useState('');

    // --- ESTADO PARA FIXTURE AUTOMÁTICO ---
    const [leagueTeams, setLeagueTeams] = useState<number[]>([]); // IDs de equipos seleccionados para la liga
    const [showFixtureModal, setShowFixtureModal] = useState(false);
    const [timeSlots, setTimeSlots] = useState('19:00, 20:00, 22:00'); // Horas por defecto
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Hoy YYYY-MM-DD

    useEffect(() => {
        fetchTeams();
        if (leagueId) fetchLeagueTeams();
    }, [leagueId]);

    async function fetchTeams() {
        const { data } = await supabase.from('teams').select('*').order('name');
        if (data) setTeams(data);
    }

    // Traer qué equipos YA están inscritos en esta liga
    async function fetchLeagueTeams() {
        const { data } = await supabase.from('league_teams').select('team_id').eq('tournament_id', leagueId);
        if (data) {
            setLeagueTeams(data.map(item => item.team_id));
        } else {
            setLeagueTeams([]);
        }
    }

    // --- LÓGICA DE SELECCIÓN DE EQUIPOS ---
    async function toggleTeamInLeague(teamId: number) {
        // Si ya está, lo sacamos
        if (leagueTeams.includes(teamId)) {
            const { error } = await supabase.from('league_teams').delete().match({ tournament_id: leagueId, team_id: teamId });
            if (!error) setLeagueTeams(prev => prev.filter(id => id !== teamId));
        } else {
            // Si no está, lo metemos
            const { error } = await supabase.from('league_teams').insert({ tournament_id: leagueId, team_id: teamId });
            if (!error) setLeagueTeams(prev => [...prev, teamId]);
        }
    }

    // --- ALGORITMO GENERADOR DE FIXTURE (ROUND ROBIN) ---
    async function generateFixture() {
        if (leagueTeams.length < 2) return Alert.alert('Error', 'Necesitas mínimo 2 equipos para hacer una liga.');

        setLoading(true);

        try {
            // 1. Preparamos los equipos
            let tournamentTeams = [...leagueTeams];
            // Si es impar, agregamos un "Dummy" (-1) para indicar fecha libre
            if (tournamentTeams.length % 2 !== 0) {
                tournamentTeams.push(-1);
            }

            const numRounds = tournamentTeams.length - 1;
            const matchesPerRound = tournamentTeams.length / 2;
            const slots = timeSlots.split(',').map(t => t.trim()).filter(t => t); // Array de horas ["19:00", "20:00"...]

            // Borramos partidos futuros de esta liga para no duplicar (Opcional, cuidado aquí)
            // await supabase.from('matches').delete().eq('tournament_id', leagueId).eq('status', 'scheduled');

            const matchesToInsert: any[] = [];
            let currentDate = new Date(startDate);
            // Ajustar la fecha al próximo día correcto si es necesario, aquí asumimos que el usuario pone la fecha del primer partido.

            // Algoritmo de Rotación
            for (let round = 0; round < numRounds; round++) {
                let slotIndex = 0;

                for (let match = 0; match < matchesPerRound; match++) {
                    const home = tournamentTeams[match];
                    const away = tournamentTeams[tournamentTeams.length - 1 - match];

                    // Si ninguno es el Dummy (-1), es un partido real
                    if (home !== -1 && away !== -1) {
                        // Asignar hora: Si hay slots disponibles, usa el siguiente. Si se acaban, repite el último o usa 00:00
                        const timeString = slots[slotIndex % slots.length] || '00:00';
                        slotIndex++;

                        // Crear objeto Date con la hora específica
                        const [hours, minutes] = timeString.split(':');
                        const matchDate = new Date(currentDate);
                        matchDate.setHours(parseInt(hours), parseInt(minutes), 0);

                        matchesToInsert.push({
                            tournament_id: leagueId,
                            home_team_id: home,
                            away_team_id: away,
                            match_date: matchDate.toISOString(),
                            status: 'scheduled'
                        });
                    }
                }

                // Rotar array para la siguiente fecha (manteniendo el primero fijo)
                // [0, 1, 2, 3] -> [0, 3, 1, 2]
                tournamentTeams.splice(1, 0, tournamentTeams.pop()!);

                // Avanzar 1 semana (7 días)
                currentDate.setDate(currentDate.getDate() + 7);
            }

            // Insertar masivamente en Supabase
            const { error } = await supabase.from('matches').insert(matchesToInsert);

            if (error) throw error;

            Alert.alert('¡Éxito!', `Se generaron ${matchesToInsert.length} partidos para ${numRounds} fechas.`);
            setShowFixtureModal(false);

        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    }

    // --- FUNCIONES SIMPLES (Crear Team/Jugador/Liga) ---
    async function createTeam() {
        if (!teamName) return;
        const { error } = await supabase.from('teams').insert({ name: teamName, logo_url: teamShield });
        if (!error) { setTeamName(''); fetchTeams(); Alert.alert('Listo', 'Equipo creado'); }
    }
    async function createPlayer() {
        if (!playerName || !selectedTeamId) return;
        const { error } = await supabase.from('players').insert({ name: playerName, team_id: parseInt(selectedTeamId) });
        if (!error) { setPlayerName(''); Alert.alert('Listo', 'Jugador creado'); }
    }
    async function createLeague() {
        if (!newLeagueName) return Alert.alert('Error', 'Ingresa un nombre');
        if (!user) return Alert.alert('Error', 'No estás logueado');

        setLoading(true);
        const { error } = await supabase.from('tournaments').insert({
            name: newLeagueName,
            is_active: true,
            start_date: new Date(),
            created_by: user.id // <--- ¡AQUÍ ESTÁ LA CLAVE!
        });
        setLoading(false);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            Alert.alert('¡Vamos!', `Liga "${newLeagueName}" creada.`);
            setNewLeagueName('');
            refreshLeagues();
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Gestión: {leagueName} 🛠️</Text>

            {/* Tabs */}
            <View style={styles.tabsRow}>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'ligas' && styles.tabActive]} onPress={() => setActiveTab('ligas')}>
                    <Text style={styles.tabText}>Torneo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'equipos' && styles.tabActive]} onPress={() => setActiveTab('equipos')}>
                    <Text style={styles.tabText}>Equipos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'jugadores' && styles.tabActive]} onPress={() => setActiveTab('jugadores')}>
                    <Text style={styles.tabText}>Jugadores</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {/* TAB LIGAS: Configuración del Torneo Actual */}
                {activeTab === 'ligas' && (
                    <View>
                        {/* Sección 1: Crear Nueva Liga */}
                        <View style={styles.card}>
                            <Text style={styles.headerCard}>Crear Nueva Liga</Text>
                            <TextInput style={styles.input} value={newLeagueName} onChangeText={setNewLeagueName} placeholder="Nombre (ej: Viernes)" />
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#7c3aed' }]} onPress={createLeague}>
                                <Text style={styles.saveText}>Crear Liga</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Sección 2: Configurar Liga Actual */}
                        <View style={styles.card}>
                            <Text style={styles.headerCard}>Configurar "{leagueName}"</Text>
                            <Text style={styles.subtext}>1. Selecciona los equipos que juegan esta liga:</Text>

                            <View style={styles.checklistContainer}>
                                {teams.map(t => {
                                    const isSelected = leagueTeams.includes(t.id);
                                    return (
                                        <TouchableOpacity key={t.id} style={[styles.checkItem, isSelected && styles.checkItemSelected]} onPress={() => toggleTeamInLeague(t.id)}>
                                            <Text style={{ fontSize: 16 }}>{t.logo_url} {t.name}</Text>
                                            <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? "#2563eb" : "#ccc"} />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.subtext}>2. Generar Calendario Automático:</Text>
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#059669', marginTop: 10 }]} onPress={() => setShowFixtureModal(true)}>
                                <Text style={styles.saveText}>⚡ Generar Fixture</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* TAB EQUIPOS (Creación Global) */}
                {activeTab === 'equipos' && (
                    <View style={styles.card}>
                        <Text style={styles.headerCard}>Crear Equipo (Global)</Text>
                        <TextInput style={styles.input} value={teamName} onChangeText={setTeamName} placeholder="Nombre del Equipo" />
                        <View style={styles.emojiSelector}>
                            {['🛡️', '🦅', '🦁', '⚡', '🔥', '💀', '⚽', '🌲', '🐻'].map(e => (
                                <TouchableOpacity key={e} onPress={() => setTeamShield(e)} style={[styles.emojiBtn, teamShield === e && styles.emojiSelected]}><Text style={{ fontSize: 20 }}>{e}</Text></TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.saveBtn} onPress={createTeam}><Text style={styles.saveText}>Guardar Equipo</Text></TouchableOpacity>
                    </View>
                )}

                {/* TAB JUGADORES */}
                {activeTab === 'jugadores' && (
                    <View style={styles.card}>
                        <Text style={styles.headerCard}>Fichar Jugador</Text>
                        <TextInput style={styles.input} value={playerName} onChangeText={setPlayerName} placeholder="Nombre" />
                        <View style={styles.pickerContainer}>
                            <Picker selectedValue={selectedTeamId} onValueChange={setSelectedTeamId}>
                                <Picker.Item label="Selecciona equipo..." value="" />
                                {teams.map(t => <Picker.Item key={t.id} label={`${t.logo_url} ${t.name}`} value={t.id.toString()} />)}
                            </Picker>
                        </View>
                        <TouchableOpacity style={styles.saveBtn} onPress={createPlayer}><Text style={styles.saveText}>Guardar Jugador</Text></TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* MODAL GENERADOR DE FIXTURE */}
            <Modal visible={showFixtureModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.headerCard}>Generador de Fixture 📅</Text>

                        <Text style={styles.label}>Fecha de Inicio (Primer Partido)</Text>
                        <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
                        <Text style={{ fontSize: 12, color: 'gray', marginBottom: 15 }}>Ej: 2024-02-16 (Debe ser el día de la semana correcto)</Text>

                        <Text style={styles.label}>Horas Disponibles (separadas por coma)</Text>
                        <TextInput
                            style={styles.input}
                            value={timeSlots}
                            onChangeText={setTimeSlots}
                            placeholder="19:00, 20:00, 22:00"
                        />
                        <Text style={styles.subtext}>El sistema saltará automáticamente las horas que no pongas aquí (ej: 21:00).</Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                            <TouchableOpacity onPress={() => setShowFixtureModal(false)} style={[styles.saveBtn, { backgroundColor: '#ccc', flex: 1, marginRight: 10 }]}>
                                <Text style={styles.saveText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={generateFixture} style={[styles.saveBtn, { backgroundColor: '#2563eb', flex: 1 }]}>
                                <Text style={styles.saveText}>{loading ? 'Creando...' : 'Confirmar'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 50, backgroundColor: '#f4f4f4' },
    title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
    tabsRow: { flexDirection: 'row', marginHorizontal: 15, marginBottom: 15, backgroundColor: '#e5e7eb', borderRadius: 10, padding: 4 },
    tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    tabActive: { backgroundColor: 'white', elevation: 2 },
    tabText: { fontWeight: '600', color: '#6b7280' },
    content: { paddingHorizontal: 15 },
    card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 2 },
    headerCard: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    subtext: { fontSize: 13, color: '#666', marginBottom: 10 },
    label: { fontWeight: 'bold', marginBottom: 5, color: '#333' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 15, backgroundColor: '#fafafa' },
    saveBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
    saveText: { color: 'white', fontWeight: 'bold' },
    checklistContainer: { maxHeight: 200, marginBottom: 20 },
    checkItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
    checkItemSelected: { backgroundColor: '#eff6ff' },
    emojiSelector: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
    emojiBtn: { padding: 8, borderRadius: 50, backgroundColor: '#f3f4f6', marginBottom: 5 },
    emojiSelected: { backgroundColor: '#bfdbfe', borderWidth: 1, borderColor: '#2563eb' },
    pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'white', padding: 25, borderRadius: 15, width: '90%' }
});