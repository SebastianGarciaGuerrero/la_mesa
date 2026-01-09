import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

// Interfaces
interface Match {
  id: number;
  home_team: { id: number; name: string; logo_url: string }; // Agregamos logo
  away_team: { id: number; name: string; logo_url: string };
  match_date: string;
  status: string;
}

interface Player {
  id: number;
  name: string;
  goals_in_match: string;
}

export default function AdminScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  // Planilla
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [saving, setSaving] = useState(false);

  // Modal para Jugador Parche
  const [showPatchModal, setShowPatchModal] = useState(false);
  const [patchName, setPatchName] = useState('');
  const [patchTeamSide, setPatchTeamSide] = useState<'home' | 'away'>('home'); // Para saber a qué lado agregarlo

  useEffect(() => {
    fetchMatches();
  }, []);

  async function fetchMatches() {
    setLoading(true);
    const { data, error } = await supabase
      .from('matches')
      .select(`
        id, match_date, status,
        home_team: teams!home_team_id (id, name, logo_url),
        away_team: teams!away_team_id (id, name, logo_url)
      `)
      .order('match_date', { ascending: true });

    if (data) {
      const formattedData = data.map((match: any) => ({
        ...match,
        // Si Supabase lo devuelve como array [{}], tomamos el primero [0]. Si es objeto, lo dejamos igual.
        home_team: Array.isArray(match.home_team) ? match.home_team[0] : match.home_team,
        away_team: Array.isArray(match.away_team) ? match.away_team[0] : match.away_team,
      }));

      setMatches(formattedData);
    }

    setLoading(false);
  }

  async function openMatchSheet(match: Match) {
    setSelectedMatch(match);
    setLoading(true);

    // Cargar jugadores OFICIALES del equipo
    const { data: localData } = await supabase.from('players').select('id, name').eq('team_id', match.home_team.id);
    const { data: visitaData } = await supabase.from('players').select('id, name').eq('team_id', match.away_team.id);

    if (localData) setHomePlayers(localData.map(p => ({ ...p, goals_in_match: '' })));
    if (visitaData) setAwayPlayers(visitaData.map(p => ({ ...p, goals_in_match: '' })));

    setLoading(false);
  }

  const updateGoals = (isHome: boolean, playerId: number, value: string) => {
    const list = isHome ? homePlayers : awayPlayers;
    const setList = isHome ? setHomePlayers : setAwayPlayers;
    const newList = list.map(p => p.id === playerId ? { ...p, goals_in_match: value } : p);
    setList(newList);
  };

  // --- LÓGICA JUGADOR PARCHE ---
  const openPatchModal = (side: 'home' | 'away') => {
    setPatchTeamSide(side);
    setPatchName('');
    setShowPatchModal(true);
  };

  async function addPatchPlayer() {
    if (!patchName || !selectedMatch) return;

    // 1. Lo creamos en la Base de Datos como "Agente Libre" (sin team_id fijo, o con el del momento)
    // Para simplificar, lo asignamos al equipo solo por ahora para que quede registro
    const teamId = patchTeamSide === 'home' ? selectedMatch.home_team.id : selectedMatch.away_team.id;

    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .insert({ name: patchName + ' (Inv)', team_id: teamId }) // Le pongo (Inv) para distinguirlo
      .select()
      .single();

    setLoading(false);
    setShowPatchModal(false);

    if (data) {
      // 2. Lo agregamos a la lista visual inmediatamente
      const newPlayer = { id: data.id, name: data.name, goals_in_match: '' };
      if (patchTeamSide === 'home') {
        setHomePlayers([...homePlayers, newPlayer]);
      } else {
        setAwayPlayers([...awayPlayers, newPlayer]);
      }
    }
  }

  // --- GUARDAR PARTIDO ---
  async function saveMatchSheet() {
    if (!selectedMatch) return;
    setSaving(true);
    try {
      let totalHome = 0, totalAway = 0;
      const goalsToInsert: any[] = [];

      homePlayers.forEach(p => {
        const g = parseInt(p.goals_in_match) || 0;
        totalHome += g;
        for (let i = 0; i < g; i++) goalsToInsert.push({ match_id: selectedMatch.id, player_id: p.id, team_id: selectedMatch.home_team.id });
      });

      awayPlayers.forEach(p => {
        const g = parseInt(p.goals_in_match) || 0;
        totalAway += g;
        for (let i = 0; i < g; i++) goalsToInsert.push({ match_id: selectedMatch.id, player_id: p.id, team_id: selectedMatch.away_team.id });
      });

      await supabase.from('matches').update({ home_score: totalHome, away_score: totalAway, status: 'finished' }).eq('id', selectedMatch.id);
      await supabase.from('goals').delete().eq('match_id', selectedMatch.id);
      if (goalsToInsert.length > 0) await supabase.from('goals').insert(goalsToInsert);

      Alert.alert('¡Listo!', `Cerrado: ${totalHome} - ${totalAway}`);
      setSelectedMatch(null);
      fetchMatches();
    } catch (error: any) { Alert.alert('Error', error.message); }
    finally { setSaving(false); }
  }

  if (!selectedMatch) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Fixture 📅</Text>
        {loading ? <ActivityIndicator size="large" /> : (
          <ScrollView>
            {matches.map(match => (
              <TouchableOpacity key={match.id} style={styles.matchCard} onPress={() => openMatchSheet(match)}>
                <Text style={styles.matchTime}>{new Date(match.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <View style={styles.teamsRow}>
                  <Text style={styles.teamName}>{match.home_team.logo_url} {match.home_team.name}</Text>
                  <Text style={styles.vs}>VS</Text>
                  <Text style={styles.teamName}>{match.away_team.logo_url} {match.away_team.name}</Text>
                </View>
                <Text style={styles.statusBadge}>{match.status === 'finished' ? '✅ Terminado' : '⏳ Jugar'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Planilla */}
      <View style={styles.headerSheet}>
        <TouchableOpacity onPress={() => setSelectedMatch(null)}><Text style={{ fontSize: 24 }}>🔙</Text></TouchableOpacity>
        <Text style={styles.sheetTitle}>Planilla de Partido</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.columnsContainer}>
          {/* LOCAL */}
          <View style={styles.column}>
            <Text style={[styles.colHeader, { color: '#1e3a8a' }]}>{selectedMatch.home_team.name}</Text>
            {homePlayers.map(p => (
              <View key={p.id} style={styles.playerRow}>
                <Text style={styles.playerName}>{p.name}</Text>
                <TextInput style={styles.goalInput} placeholder="0" keyboardType="numeric" value={p.goals_in_match} onChangeText={(v) => updateGoals(true, p.id, v)} />
              </View>
            ))}
            {/* Botón Parche Local */}
            <TouchableOpacity style={styles.addPatchBtn} onPress={() => openPatchModal('home')}>
              <Text style={styles.addPatchText}>+ Invitado</Text>
            </TouchableOpacity>
          </View>

          <View style={{ width: 1, backgroundColor: '#ddd', marginHorizontal: 5 }} />

          {/* VISITA */}
          <View style={styles.column}>
            <Text style={[styles.colHeader, { color: '#dc2626' }]}>{selectedMatch.away_team.name}</Text>
            {awayPlayers.map(p => (
              <View key={p.id} style={styles.playerRow}>
                <TextInput style={styles.goalInput} placeholder="0" keyboardType="numeric" value={p.goals_in_match} onChangeText={(v) => updateGoals(false, p.id, v)} />
                <Text style={[styles.playerName, { textAlign: 'right' }]}>{p.name}</Text>
              </View>
            ))}
            {/* Botón Parche Visita */}
            <TouchableOpacity style={styles.addPatchBtn} onPress={() => openPatchModal('away')}>
              <Text style={styles.addPatchText}>+ Invitado</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Footer Totales */}
      <View style={styles.footer}>
        <Text style={styles.scorePreview}>
          {homePlayers.reduce((s, p) => s + (parseInt(p.goals_in_match) || 0), 0)} - {awayPlayers.reduce((s, p) => s + (parseInt(p.goals_in_match) || 0), 0)}
        </Text>
        <TouchableOpacity style={styles.saveButton} onPress={saveMatchSheet} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Guardando...' : 'CERRAR PARTIDO'}</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL PARA JUGADOR PARCHE */}
      <Modal visible={showPatchModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Jugador Parche 🩹</Text>
            <Text style={{ marginBottom: 10 }}>Se unirá a: {patchTeamSide === 'home' ? selectedMatch.home_team.name : selectedMatch.away_team.name}</Text>
            <TextInput
              style={styles.inputModal}
              placeholder="Nombre del Jugador"
              value={patchName}
              onChangeText={setPatchName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={() => setShowPatchModal(false)} style={[styles.modalBtn, { backgroundColor: '#ccc' }]}>
                <Text>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addPatchPlayer} style={[styles.modalBtn, { backgroundColor: '#2563eb' }]}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 50 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  matchCard: { backgroundColor: 'white', marginHorizontal: 15, marginBottom: 15, padding: 15, borderRadius: 12, elevation: 2 },
  matchTime: { fontWeight: 'bold', color: '#555' },
  teamsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
  teamName: { fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  vs: { color: '#999', fontWeight: 'bold', marginHorizontal: 10 },
  statusBadge: { textAlign: 'center', fontSize: 12, color: '#888' },
  headerSheet: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 15, borderBottomWidth: 1, borderColor: '#ddd' },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  columnsContainer: { flexDirection: 'row', padding: 10 },
  column: { flex: 1 },
  colHeader: { textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 15 },
  playerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' },
  playerName: { fontSize: 13, flex: 1, flexWrap: 'wrap' },
  goalInput: { width: 40, height: 40, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, textAlign: 'center', fontSize: 16, fontWeight: 'bold', backgroundColor: 'white', marginHorizontal: 5 },
  footer: { backgroundColor: 'white', padding: 20, borderTopWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  scorePreview: { fontSize: 32, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  saveButton: { backgroundColor: '#10b981', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 10, width: '100%', alignItems: 'center' },
  saveText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  // Estilos Parche
  addPatchBtn: { marginTop: 10, padding: 8, backgroundColor: '#e0f2fe', borderRadius: 5, alignItems: 'center' },
  addPatchText: { color: '#0284c7', fontWeight: 'bold', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 15, width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  inputModal: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 20 },
  modalBtn: { padding: 10, borderRadius: 8, width: '45%', alignItems: 'center' }
});