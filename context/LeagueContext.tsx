import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// 1. Definimos qué datos vamos a compartir
interface LeagueContextType {
    leagueId: number;
    leagueName: string;
    changeLeague: (id: number, name: string) => void;
    leaguesList: any[];
    refreshLeagues: () => void;
}

// 2. Creamos el contexto vacío
const LeagueContext = createContext<LeagueContextType>({} as LeagueContextType);

// 3. El Proveedor (la "antena" que emite la señal)
export function LeagueProvider({ children }: { children: ReactNode }) {
    const [leagueId, setLeagueId] = useState<number>(1); // ID 1 por defecto (Galaxias)
    const [leagueName, setLeagueName] = useState<string>('Cargando...');
    const [leaguesList, setLeaguesList] = useState<any[]>([]);

    useEffect(() => {
        refreshLeagues();
        loadPersistedLeague();
    }, []);

    async function refreshLeagues() {
        // Traemos solo torneos activos
        const { data } = await supabase.from('tournaments').select('*').eq('is_active', true);
        if (data) setLeaguesList(data);
    }

    // Cargar la última liga que el usuario eligió (para que no se reinicie al cerrar la app)
    async function loadPersistedLeague() {
        try {
            const savedId = await AsyncStorage.getItem('selectedLeagueId');
            const savedName = await AsyncStorage.getItem('selectedLeagueName');
            if (savedId) {
                setLeagueId(parseInt(savedId));
                setLeagueName(savedName || 'Liga');
            }
        } catch (e) {
            console.log('Error cargando liga guardada', e);
        }
    }

    // Cambiar de liga y guardar en memoria
    async function changeLeague(id: number, name: string) {
        setLeagueId(id);
        setLeagueName(name);
        await AsyncStorage.setItem('selectedLeagueId', id.toString());
        await AsyncStorage.setItem('selectedLeagueName', name);
    }

    return (
        <LeagueContext.Provider value={{ leagueId, leagueName, changeLeague, leaguesList, refreshLeagues }}>
            {children}
        </LeagueContext.Provider>
    );
}

// 4. El Hook para usarlo fácil
export const useLeague = () => useContext(LeagueContext);