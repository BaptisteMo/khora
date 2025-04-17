"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { createGame } from '@/lib/database';

export default function NewGame() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [playerCount, setPlayerCount] = useState(2);
  const [isCreating, setIsCreating] = useState(false);
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
    if (!title.trim()) {
      setError('Please enter a game title');
      return;
    }

    try {
      setIsCreating(true);
      
      const game = await createGame({
        host_id: user!.id,
        title: title.trim(),
        settings: {
          playerCount,
        }
      });

      // Redirect to the game page
      router.push(`/games/${game.id}`);
    } catch (error: any) {
      setError(error?.message || 'Failed to create game');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Game</h1>
          
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded mb-6">
              {error}
            </div>
          )}
          
          <div className="bg-white shadow-sm rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Game Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Saturday Night Khôra"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="playerCount" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Players
                </label>
                <select
                  id="playerCount"
                  value={playerCount}
                  onChange={(e) => setPlayerCount(Number(e.target.value))}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                >
                  {[2, 3, 4, 5].map((count) => (
                    <option key={count} value={count}>{count} players</option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Select the number of players for this game session.
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
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Game'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
} 