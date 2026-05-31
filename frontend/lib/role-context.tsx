"use client";

import { createContext, useContext } from "react";

export type UserRole = "faculty" | "vendor" | "admin" | "superadmin";

type RoleContextValue = {
  role: UserRole;
  displayName: string;
  avatarUrl: string;
};

const RoleContext = createContext<RoleContextValue>({
  role: "faculty",
  displayName: "Dr. Aditi Sharma",
  avatarUrl: "/user-no-av.png",
});

export function useRole() {
  return useContext(RoleContext);
}

export function RoleProvider({
  value,
  children,
}: {
  value: RoleContextValue;
  children: React.ReactNode;
}) {
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
