"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function GameList() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Load games data if authenticated
    if (user) {
      loadGamesData();
    }
  }, [authLoading, user, router, activeTab]);

  const loadGamesData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get all games where the user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('game_participants')
        .select('game_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      // Extract game IDs
      const gameIds = participantData.map(p => p.game_id);

      if (gameIds.length === 0) {
        setGames([]);
        setIsLoading(false);
        return;
      }

      // Get game details
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          host:host_id (id, email),
          participants:game_participants (
            id,
            user_id,
            score,
            users:user_id (id, email)
          )
        `)
        .in('id', gameIds)
        .eq('status', activeTab === 'active' ? 'pending' : 'completed')
        .order('created_at', { ascending: false });

      if (gamesError) throw gamesError;

      setGames(gamesData || []);
    } catch (error: any) {
      setError(error?.message || 'Failed to load games');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">My Games</h1>
          <div className="flex space-x-4">
            <Link href="/games/new">
              <Button>Create New Game</Button>
            </Link>
            <Link href="/games/join">
              <Button variant="outline">Join Game</Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
            <p>{error}</p>
          </div>
        )}

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('active')}
                className={`${
                  activeTab === 'active'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
              >
                Active Games
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`${
                  activeTab === 'completed'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
              >
                Completed Games
              </button>
            </nav>
          </div>
        </div>

        {games.length === 0 ? (
          <div className="bg-white shadow-sm rounded-lg p-12 text-center">
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {activeTab === 'active' 
                ? "You don't have any active games" 
                : "You don't have any completed games"}
            </h3>
            <p className="text-gray-500 mb-6">
              {activeTab === 'active'
                ? "Create a new game or join an existing one to get started."
                : "Your completed games will appear here."}
            </p>
            {activeTab === 'active' && (
              <div className="flex justify-center space-x-4">
                <Link href="/games/new">
                  <Button>Create Game</Button>
                </Link>
                <Link href="/games/join">
                  <Button variant="outline">Join Game</Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => (
              <Link href={`/games/${game.id}`} key={game.id}>
                <div className="bg-white shadow-sm rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{game.title}</h3>
                  
                  <div className="flex justify-between text-sm text-gray-500 mb-4">
                    <span>
                      Game Code: {game.game_url}
                    </span>
                    <span>
                      {new Date(game.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Players:</span>
                      <span className="text-sm font-medium">{game.participants?.length || 0}</span>
                    </div>
                    
                    {activeTab === 'completed' && game.winner_id && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Winner:</span>
                        <span className="text-sm font-medium">
                          {game.winner_id === user.id 
                            ? 'You' 
                            : game.participants?.find(p => p.user_id === game.winner_id)?.users?.email || 'Unknown'}
                        </span>
                      </div>
                    )}
                    
                    {game.host_id === user.id && (
                      <div className="mt-3">
                        <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                          You are the host
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 