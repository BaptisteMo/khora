"use client";

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { getGame, listParticipants, updateGame, updateParticipant } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { ActionType, SCORING_RULES, isLegalAction, ScoreCalculator } from '@/lib/scoring';
import Notification from '@/components/ui/Notification';

export default function GameDetail({ params }: { params: Promise<{ id: string }> }) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const unwrappedParams = use(params);
  const [game, setGame] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('setup');
  const [isHost, setIsHost] = useState(false);
  const [playerActions, setPlayerActions] = useState<any[]>([]);
  const [selectedActionType, setSelectedActionType] = useState<ActionType | ''>('');
  const [actionValue, setActionValue] = useState<number>(1);
  const [actionFeedback, setActionFeedback] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: string } | null>(null);
  const prevPhaseRef = useRef<string>(currentPhase);

  // Game phases
  const phases = [
    { id: 'setup', name: 'Setup' },
    { id: 'event', name: 'Event' },
    { id: 'tax', name: 'Tax' },
    { id: 'dice', name: 'Dice' },
    { id: 'action', name: 'Action' },
    { id: 'progress', name: 'Progress' },
    { id: 'resolution', name: 'Resolution' },
    { id: 'achievement', name: 'Achievement' },
  ];

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Load game data if authenticated
    if (user && unwrappedParams.id) {
      loadGameData();
    }

    // --- Supabase Realtime subscriptions ---
    if (unwrappedParams.id) {
      // Subscribe to changes in the game row
      const gameSub = supabase
        .channel('game-detail-game')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'games', filter: `id=eq.${unwrappedParams.id}` },
          (payload) => {
            loadGameData();
          }
        )
        .subscribe();

      // Subscribe to changes in the participants for this game
      const participantsSub = supabase
        .channel('game-detail-participants')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_participants', filter: `game_id=eq.${unwrappedParams.id}` },
          (payload) => {
            loadGameData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(gameSub);
        supabase.removeChannel(participantsSub);
      };
    }
  }, [authLoading, user, unwrappedParams.id, router]);

  useEffect(() => {
    if (prevPhaseRef.current !== currentPhase) {
      // Only show notification if phase actually changed
      const phaseName = phases.find(p => p.id === currentPhase)?.name || currentPhase;
      setNotification({
        message: `Phase changed: ${phaseName}`,
        type: 'info',
      });
      prevPhaseRef.current = currentPhase;
    }
  }, [currentPhase]);

  useEffect(() => {
    if (game && game.status === 'completed') {
      const winner = participants.find(p => p.user_id === game.winner_id);
      setNotification({
        message: `Game Over! Winner: ${winner?.users?.username || winner?.user_id || 'Unknown'}`,
        type: 'success',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status]);

  const loadGameData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch the game details
      const gameData = await getGame(unwrappedParams.id);
      setGame(gameData);
      setIsHost(gameData.host_id === user?.id);

      // Fetch the participants
      const participantsData = await listParticipants(unwrappedParams.id);
      setParticipants(participantsData);

      // Set current phase from game settings or default to setup
      if (gameData.settings?.phase) {
        setCurrentPhase(gameData.settings.phase);
      }

    } catch (error: any) {
      setError(error?.message || 'Failed to load game data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPhase = async () => {
    if (!game || !isHost) return;

    try {
      const currentIndex = phases.findIndex(phase => phase.id === currentPhase);
      const nextIndex = (currentIndex + 1) % phases.length;
      const nextPhase = phases[nextIndex].id;
      
      // Update game settings with new phase
      const updatedGame = await updateGame(game.id, {
        settings: {
          ...game.settings,
          phase: nextPhase
        }
      });
      
      setGame(updatedGame);
      setCurrentPhase(nextPhase);

    } catch (error: any) {
      setError(error?.message || 'Failed to update game phase');
    }
  };

  const updatePlayerScore = async (userId: string, score: number) => {
    if (!game) return;

    try {
      await updateParticipant(game.id, userId, { score });
      
      // Refresh participants data
      const participantsData = await listParticipants(game.id);
      setParticipants(participantsData);
    } catch (error: any) {
      setError(error?.message || 'Failed to update player score');
    }
  };

  const updatePlayerDiceResult = async (userId: string, diceResult: string) => {
    if (!game) return;
    try {
      await updateParticipant(game.id, userId, { dice_result: diceResult });
      // Refresh participants data
      const participantsData = await listParticipants(game.id);
      setParticipants(participantsData);
    } catch (error: any) {
      setError(error?.message || 'Failed to update dice result');
    }
  };

  const handleEndGame = async () => {
    if (!game || !isHost) return;

    try {
      // Find highest scoring participant
      const highestScoringParticipant = participants.reduce((highest, current) => {
        return (current.score > highest.score) ? current : highest;
      }, participants[0]);

      // Update game status to completed and set winner
      await updateGame(game.id, {
        status: 'completed',
        ended_at: new Date().toISOString(),
        winner_id: highestScoringParticipant?.user_id
      });

      // Redirect to dashboard
      router.push('/dashboard');
      
    } catch (error: any) {
      setError(error?.message || 'Failed to end game');
    }
  };

  // Helper: get current user's action for this phase
  const currentUserAction = playerActions.find(
    (a) => a.userId === user?.id && a.phase === currentPhase
  );

  // Handler to submit action
  const handleSubmitAction = async () => {
    if (!selectedActionType || !user) return;
    const action = {
      userId: user.id,
      actionType: selectedActionType,
      value: actionValue,
      phase: currentPhase,
      timestamp: new Date().toISOString(),
    };
    if (!isLegalAction(action)) {
      setActionFeedback('Illegal action: value out of range or not allowed.');
      return;
    }
    setSubmittingAction(true);
    // For now, just update local state (replace with backend call as needed)
    setPlayerActions((prev) => [
      ...prev.filter((a) => !(a.userId === user.id && a.phase === currentPhase)),
      action,
    ]);
    setActionFeedback(`Action submitted! You will gain ${SCORING_RULES[selectedActionType](action)} points.`);
    setSubmittingAction(false);

    if (selectedActionType === ActionType.Achievement) {
      setNotification({
        message: 'Congratulations! You earned an achievement!',
        type: 'success',
      });
    }
  };

  // Handler to undo action
  const handleUndoAction = () => {
    if (!user) return;
    setPlayerActions((prev) => prev.filter((a) => !(a.userId === user.id && a.phase === currentPhase)));
    setActionFeedback('Action undone.');
    setSelectedActionType('');
    setActionValue(1);
  };

  // Calculate running scores for all players
  const scoreCalculator = new ScoreCalculator(playerActions);
  const runningScores = participants.map((p) => ({
    userId: p.user_id,
    username: p.users?.username || p.user_id,
    score: scoreCalculator.calculateScore(p.user_id),
  }));

  // Show loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-destructive/10 text-destructive p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p>{error}</p>
            <Button
              className="mt-4"
              onClick={() => router.push('/dashboard')}
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (game) {
    return (
      <div className="min-h-screen bg-gray-50">
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type as any}
            onClose={() => setNotification(null)}
          />
        )}
        <Navbar />
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{game.title}</h1>
                <p className="text-sm text-gray-500">Game Code: {game.game_url}</p>
              </div>
              <div className="mt-4 md:mt-0">
                <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full">
                  <span className="mr-2 font-medium text-primary">
                    {phases.find(phase => phase.id === currentPhase)?.name} Phase
                  </span>
                </div>
              </div>
            </div>

            {isHost && (
              <div className="flex justify-end space-x-4 mb-6">
                <Button variant="outline" onClick={handleNextPhase}>
                  Next Phase
                </Button>
                <Button variant="outline" onClick={handleEndGame}>
                  End Game
                </Button>
              </div>
            )}

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Players</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {participants.map((participant) => (
                  <div 
                    key={participant.id} 
                    className={`bg-gray-50 rounded-lg p-4 border ${participant.user_id === user?.id ? 'border-primary' : 'border-gray-200'}`}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{participant.users?.username || participant.user_id}</span>
                      {participant.user_id === game.host_id && (
                        <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">Host</span>
                      )}
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Score</span>
                        <div className="flex items-center space-x-2">
                          {(isHost || participant.user_id === user?.id) && (
                            <button 
                              className="p-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700"
                              onClick={() => updatePlayerScore(participant.user_id, Math.max(0, (participant.score || 0) - 1))}
                              aria-label="Decrease score"
                            >
                              -
                            </button>
                          )}
                          <span className="font-medium w-8 text-center">{participant.score || 0}</span>
                          {(isHost || participant.user_id === user?.id) && (
                            <button 
                              className="p-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700"
                              onClick={() => updatePlayerScore(participant.user_id, (participant.score || 0) + 1)}
                              aria-label="Increase score"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Game Phase: {phases.find(phase => phase.id === currentPhase)?.name}</h2>
            
            {currentPhase === 'setup' && (
              <div>
                <p className="text-gray-600 mb-4">Prepare your game board and components. Make sure each player has their city board and starting resources.</p>
                {isHost && <p className="text-gray-600">As the host, you can advance to the next phase when everyone is ready.</p>}
              </div>
            )}
            
            {currentPhase === 'event' && (
              <div>
                <p className="text-gray-600 mb-4">Draw an event card and read it out loud. The event will be resolved during the Resolution phase.</p>
                {isHost && <p className="text-gray-600">As the host, you can advance to the next phase when the event has been announced.</p>}
              </div>
            )}
            
            {currentPhase === 'tax' && (
              <div>
                <p className="text-gray-600 mb-4">Collect taxes based on your tax level. Update your resources accordingly.</p>
                {isHost && <p className="text-gray-600">As the host, you can advance to the next phase when all players have collected their taxes.</p>}
              </div>
            )}
            
            {currentPhase === 'dice' && (
              <div>
                <p className="text-gray-600 mb-4">Roll the dice and choose your actions based on the results.</p>
                {isHost && <p className="text-gray-600">As the host, you can advance to the next phase when all players have seen the dice results.</p>}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Dice Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {participants.map((participant) => {
                      const isCurrentUser = participant.user_id === user?.id;
                      const hasRolled = Boolean(participant.dice_result);
                      let diceDisplay = null;
                      if (participant.dice_result) {
                        const [d1, d2] = participant.dice_result.split(',').map(Number);
                        diceDisplay = (
                          <span className="font-mono text-lg">🎲 {d1} &amp; {d2}</span>
                        );
                      }
                      return (
                        <div key={participant.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between mb-2">
                            <span className="font-medium">{participant.users?.username || participant.user_id}</span>
                            {participant.user_id === game.host_id && (
                              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">Host</span>
                            )}
                          </div>
                          <div className="mt-2">
                            <label className="block text-sm text-gray-600 mb-1">Dice Result</label>
                            {isCurrentUser ? (
                              <div>
                                {hasRolled ? (
                                  <div className="bg-white p-2 rounded border border-gray-100 min-h-[2.5rem] flex items-center justify-between">
                                    {diceDisplay}
                                    <span className="text-xs text-gray-400 ml-2">(Already rolled)</span>
                                  </div>
                                ) : (
                                  <button
                                    className="w-full p-2 bg-primary text-white rounded hover:bg-primary/90 transition"
                                    onClick={async () => {
                                      const d1 = Math.floor(Math.random() * 6) + 1;
                                      const d2 = Math.floor(Math.random() * 6) + 1;
                                      await updatePlayerDiceResult(participant.user_id, `${d1},${d2}`);
                                    }}
                                  >
                                    Roll Dice
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="bg-white p-2 rounded border border-gray-100 min-h-[2.5rem]">
                                {diceDisplay || <span className="text-gray-400">No result yet</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {currentPhase === 'action' && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Player Action</h2>
                {currentUserAction ? (
                  <div className="bg-green-50 border border-green-200 rounded p-4 mb-2">
                    <div className="flex items-center justify-between">
                      <span>
                        <b>Action:</b> {currentUserAction.actionType} <b>Value:</b> {currentUserAction.value}
                      </span>
                      <button
                        className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        onClick={handleUndoAction}
                      >
                        Undo
                      </button>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Points: {SCORING_RULES[currentUserAction.actionType](currentUserAction)}
                    </div>
                  </div>
                ) : (
                  <form
                    className="flex flex-col md:flex-row md:items-end gap-4 mb-2"
                    onSubmit={e => { e.preventDefault(); handleSubmitAction(); }}
                  >
                    <div>
                      <label className="block text-sm font-medium mb-1">Action Type</label>
                      <select
                        className="border rounded p-2 min-w-[140px]"
                        value={selectedActionType}
                        onChange={e => setSelectedActionType(e.target.value as ActionType)}
                        required
                      >
                        <option value="">Select...</option>
                        {Object.values(ActionType).map((type) => (
                          <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Value</label>
                      <input
                        type="number"
                        className="border rounded p-2 w-24"
                        min={1}
                        max={20}
                        value={actionValue}
                        onChange={e => setActionValue(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <button
                        type="submit"
                        className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
                        disabled={submittingAction || !selectedActionType}
                      >
                        Confirm Action
                      </button>
                    </div>
                  </form>
                )}
                {selectedActionType && !currentUserAction && (
                  <div className="text-sm text-gray-500 mb-2">
                    This action will give you <b>{SCORING_RULES[selectedActionType]({ userId: user?.id, actionType: selectedActionType, value: actionValue, phase: currentPhase, timestamp: new Date().toISOString() })}</b> points.
                  </div>
                )}
                {actionFeedback && (
                  <div className="text-xs text-blue-600 mb-2">{actionFeedback}</div>
                )}
                <div className="text-xs text-gray-400">
                  <b>Tip:</b> Hover over action types for more info. (Tooltips coming soon)
                </div>
                <div className="mt-4">
                  <h3 className="font-semibold mb-1">Your Actions This Phase</h3>
                  <ul className="list-disc ml-6 text-sm">
                    {playerActions.filter(a => a.userId === user?.id && a.phase === currentPhase).map((a, idx) => (
                      <li key={idx}>{a.actionType} (Value: {a.value}, Points: {SCORING_RULES[a.actionType](a)})</li>
                    ))}
                  </ul>
                </div>
                {/* Running Score Visualization */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-2">Running Scores</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-[300px] w-full border border-gray-200 rounded">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-2 text-left">Player</th>
                          <th className="px-4 py-2 text-left">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runningScores.map((rs) => (
                          <tr key={rs.userId} className="border-t">
                            <td className="px-4 py-2">{rs.username}</td>
                            <td className="px-4 py-2 font-bold">{rs.score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {currentPhase === 'progress' && (
              <div>
                <p className="text-gray-600 mb-4">Update your city's progress tracks based on your actions this round.</p>
                {isHost && <p className="text-gray-600">As the host, you can advance to the next phase when all players have updated their progress.</p>}
              </div>
            )}
            
            {currentPhase === 'resolution' && (
              <div>
                <p className="text-gray-600 mb-4">Resolve the event from the beginning of the round.</p>
                {isHost && <p className="text-gray-600">As the host, you can advance to the next phase when the event has been resolved.</p>}
              </div>
            )}
            
            {currentPhase === 'achievement' && (
              <div>
                <p className="text-gray-600 mb-4">Check if any players have completed achievements and award victory points accordingly.</p>
                {isHost && <p className="text-gray-600">As the host, you can advance to the next phase when all achievements have been checked.</p>}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return null;
} 