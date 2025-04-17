"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { updateUser } from '@/lib/database';

export default function Profile() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const router = useRouter();
  
  const [username, setUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [userStats, setUserStats] = useState<any>({
    gamesPlayed: 0,
    gamesWon: 0,
    winRate: 0,
    averageScore: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Load user data if authenticated
    if (user) {
      loadUserData();
    }
  }, [authLoading, user, router]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get user profile data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) {
        // If user doesn't exist in the users table yet, create an entry
        if (userError.code === 'PGRST116') {
          await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            username: user.email?.split('@')[0] || 'User',
          });

          setUsername(user.email?.split('@')[0] || 'User');
        } else {
          throw userError;
        }
      } else {
        setUsername(userData?.username || '');
      }

      // Get user game statistics
      const { data: participantData, error: participantError } = await supabase
        .from('game_participants')
        .select(`
          *,
          games:game_id (
            id,
            status,
            winner_id
          )
        `)
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      // Calculate statistics
      if (participantData && participantData.length > 0) {
        const completedGames = participantData.filter(p => p.games?.status === 'completed');
        const gamesPlayed = completedGames.length;
        const gamesWon = completedGames.filter(p => p.games?.winner_id === user.id).length;
        const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
        
        // Calculate average score from completed games
        const totalScore = completedGames.reduce((sum, game) => sum + (game.score || 0), 0);
        const averageScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;

        setUserStats({
          gamesPlayed,
          gamesWon,
          winRate,
          averageScore,
        });
      }

    } catch (error: any) {
      setError(error?.message || 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      setIsUpdating(true);
      setError(null);

      // Basic validation
      if (!username.trim()) {
        setError('Username cannot be empty');
        setIsUpdating(false);
        return;
      }

      // Update profile
      await updateUser(user.id, {
        username: username.trim(),
      });

      setIsEditing(false);
    } catch (error: any) {
      setError(error?.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
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
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Profile</h1>
          
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded mb-6">
              <p>{error}</p>
            </div>
          )}
          
          <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
                {!isEditing && (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                    {user?.email}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                      {username}
                    </div>
                  )}
                </div>
                
                {isEditing && (
                  <div className="flex justify-end space-x-4 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        loadUserData(); // Reset form
                      }}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateProfile} disabled={isUpdating}>
                      {isUpdating ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Game Statistics</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-primary mb-1">{userStats.gamesPlayed}</div>
                  <div className="text-sm text-gray-600">Games Played</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-primary mb-1">{userStats.gamesWon}</div>
                  <div className="text-sm text-gray-600">Victories</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-primary mb-1">{userStats.winRate}%</div>
                  <div className="text-sm text-gray-600">Win Rate</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-primary mb-1">{userStats.averageScore}</div>
                  <div className="text-sm text-gray-600">Avg. Score</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
} 