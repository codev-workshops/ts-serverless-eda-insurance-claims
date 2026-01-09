'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, FileText, PlusCircle, Settings, LogOut, User } from 'lucide-react';

interface NavbarProps {
  user?: {
    name: string;
    email: string;
    picture?: string;
  } | null;
  isAdmin?: boolean;
}

export default function Navbar({ user, isAdmin }: NavbarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/claims', label: 'Claims', icon: FileText },
    { href: '/claims/new', label: 'New Claim', icon: PlusCircle },
  ];

  if (isAdmin) {
    navItems.push({ href: '/admin', label: 'Admin', icon: Settings });
  }

  return (
    <nav className="bg-white shadow-md border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                Insurance Claims
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-2">
                    {user.picture ? (
                      <Image
                        src={user.picture}
                        alt={user.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                    <User className="w-8 h-8 p-1 bg-gray-200 rounded-full" />
                  )}
                  <span className="text-sm text-gray-700">{user.name}</span>
                </div>
                <a
                  href="/api/auth/signout"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </a>
              </>
            ) : (
              <a
                href="/api/auth/signin"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Sign In
              </a>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
