"use client"

import { createContext, useContext, type ReactNode } from 'react';

type UserRole = 'admin' | 'user' | 'guest';

const UserRoleContext = createContext<UserRole | undefined>(undefined);

export function UserRoleProvider({ children, role }: { children: ReactNode; role: UserRole }) {
  return (
    <UserRoleContext.Provider value={role}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}
