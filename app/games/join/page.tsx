"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { getGameByUrl, addParticipant } from '@/lib/database';

export default function JoinGame() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [gameUrl, setGameUrl] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  if (!isLoading && !user) {
    router.push('/login');
    return null;
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!gameUrl.trim()) {
      setError('Please enter a game URL');
      return;
    }

    try {
      setIsJoining(true);
      
      // Get the game ID from the URL
      const game = await getGameByUrl(gameUrl.trim());
      
      if (!game) {
        throw new Error('Game not found');
      }
      
      // Join the game
      await addParticipant(game.id, user!.id);

      // Redirect to the game page
      router.push(`/games/${game.id}`);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        setError((error as { message?: string }).message || 'Failed to join game');
      } else {
        setError('Failed to join game');
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Join Game</h1>
          
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded mb-6">
              {error}
            </div>
          )}
          
          <div className="bg-white shadow-sm rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="gameUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Game URL or Code
                </label>
                <input
                  id="gameUrl"
                  type="text"
                  value={gameUrl}
                  onChange={(e) => setGameUrl(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                  placeholder="Enter the game URL or code"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter the game URL or code shared by the game creator.
                </p>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="mr-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isJoining}
                >
                  {isJoining ? 'Joining...' : 'Join Game'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
} 