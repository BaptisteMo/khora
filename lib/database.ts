import { supabase } from './supabase';

// Users
export const getUser = async (id: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
};

export const updateUser = async (id: string, userData: { username?: string; avatar_url?: string }) => {
  const { data, error } = await supabase
    .from('users')
    .update(userData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteUser = async (id: string) => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

// Games
export const createGame = async (gameData: { 
  host_id: string; 
  title: string;
  settings?: Record<string, unknown>;
  status?: string;
}) => {
  // Generate a unique game URL
  const gameUrl = `${Math.random().toString(36).substring(2, 8)}`;

  const { data, error } = await supabase
    .from('games')
    .insert({
      ...gameData,
      game_url: gameUrl,
      status: gameData.status || 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  
  // Automatically add host as participant
  await addParticipant(data.id, data.host_id);
  
  return data;
};

export const getGame = async (id: string) => {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const getGameByUrl = async (gameUrl: string) => {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('game_url', gameUrl)
    .single();

  if (error) throw error;
  return data;
};

export const updateGame = async (id: string, gameData: {
  title?: string;
  status?: string;
  settings?: Record<string, unknown>;
  ended_at?: string;
  winner_id?: string;
}) => {
  const { data, error } = await supabase
    .from('games')
    .update(gameData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteGame = async (id: string) => {
  // First delete all participants
  const { error: participantsError } = await supabase
    .from('game_participants')
    .delete()
    .eq('game_id', id);

  if (participantsError) throw participantsError;

  // Then delete the game
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

export const listGames = async (filters?: {
  host_id?: string;
  status?: string;
  limit?: number;
}) => {
  let query = supabase
    .from('games')
    .select('*');

  if (filters?.host_id) {
    query = query.eq('host_id', filters.host_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data;
};

// Game Participants
export const addParticipant = async (gameId: string, userId: string) => {
  const { data, error } = await supabase
    .from('game_participants')
    .insert({
      game_id: gameId,
      user_id: userId,
      status: 'active',
      score: 0
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const removeParticipant = async (gameId: string, userId: string) => {
  const { error } = await supabase
    .from('game_participants')
    .delete()
    .eq('game_id', gameId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
};

export const updateParticipant = async (
  gameId: string, 
  userId: string, 
  data: { score?: number; status?: string }
) => {
  const { data: participantData, error } = await supabase
    .from('game_participants')
    .update(data)
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return participantData;
};

export const listParticipants = async (gameId: string) => {
  const { data, error } = await supabase
    .from('game_participants')
    .select(`
      *,
      users:user_id (id, username, avatar_url)
    `)
    .eq('game_id', gameId);

  if (error) throw error;
  return data;
};

// Fetch a user's game history (completed games)
export const getUserGameHistory = async (userId: string) => {
  // Get all completed games where the user was a participant
  const { data: participantData, error: participantError } = await supabase
    .from('game_participants')
    .select(`
      *,
      games:game_id (
        id,
        title,
        created_at,
        ended_at,
        status,
        winner_id,
        host_id,
        game_url,
        participants:game_participants (
          id,
          user_id,
          score,
          users:user_id (id, username)
        )
      )
    `)
    .eq('user_id', userId);

  if (participantError) throw participantError;

  // Filter for completed games only
  const completedGames = (participantData || []).filter(
    (p) => p.games && p.games.status === 'completed'
  );

  return completedGames;
}; 