'use client';

import { createContext, useContext } from 'react';
import type { SessionUser } from '@/lib/auth';

const UserContext = createContext<SessionUser | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** The authenticated officer for the current session (available inside the app shell). */
export function useUser(): SessionUser {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error('useUser must be used inside the authenticated app shell');
  }
  return user;
}
