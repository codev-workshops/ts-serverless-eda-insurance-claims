'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white rounded-full shadow-lg">
            <Shield className="w-16 h-16 text-blue-600" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          Insurance Claims Portal
        </h1>
        <p className="text-blue-100 text-lg mb-8">
          Manage your insurance claims efficiently and securely
        </p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
        <p className="text-blue-200 mt-4 text-sm">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
