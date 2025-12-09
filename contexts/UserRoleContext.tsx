"use client"

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';

type UserRole = 'admin' | 'user' | 'guest';

interface UserRoleContextType {
  role: UserRole;
  setRole: Dispatch<SetStateAction<UserRole>>;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children, initialRole }: { children: ReactNode; initialRole: UserRole }) {
  const [role, setRole] = useState<UserRole>(initialRole);

  return (
    <UserRoleContext.Provider value={{ role, setRole }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    // This will just return 'guest' if used outside the provider, which is safer
    // for components that might render on public pages.
    return 'guest'; 
  }
  return context.role;
}

export function useSetUserRole() {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useSetUserRole must be used within a UserRoleProvider');
  }
  return context.setRole;
}
