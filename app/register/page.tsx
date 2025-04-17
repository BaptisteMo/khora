"use client";

import RegisterForm from '@/components/auth/RegisterForm';
import Navbar from '@/components/layout/Navbar';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Create your account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Join the Khôra Game Companion
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
} 