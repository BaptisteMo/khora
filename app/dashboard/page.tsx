"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Show dashboard content if authenticated
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome, {user.email}</h1>
            <p className="text-gray-600">Manage your Khôra game sessions and view your statistics.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Game Statistics</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Games Played</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Victories</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Win Rate</span>
                  <span className="font-medium">0%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Score</span>
                  <span className="font-medium">0</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Games</h2>
              <div className="text-center py-8 text-gray-500">
                <p>No recent games found</p>
              </div>
            </div>
            
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link href="/games/new">
                  <Button className="w-full">Create Game</Button>
                </Link>
                <Link href="/games/join">
                  <Button variant="outline" className="w-full">Join Game</Button>
                </Link>
                <Link href="/profile">
                  <Button variant="outline" className="w-full">View Profile</Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // This should never render due to the redirect
  return null;
} 