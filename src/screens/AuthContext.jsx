import { createContext, useContext, useState } from 'react';

// Shared demo-role state and actions for components outside the page tree.
const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Restore the last selected demo role when the page is reopened.
  const [role, setRole] = useState(() => localStorage.getItem('demo_role'));

  // Persist the selected role so reloads stay in the same demo view.
  const loginAsDemo = (selectedRole) => {
    localStorage.setItem('demo_role', selectedRole);
    setRole(selectedRole);
  };

  // Toggle between the two available demo perspectives.
  const switchRole = () => {
    const nextRole = role === 'admin' ? 'user' : 'admin';
    localStorage.setItem('demo_role', nextRole);
    setRole(nextRole);
  };

  // Clear the demo session and return to the signed-out state.
  const logout = () => {
    localStorage.removeItem('demo_role');
    setRole(null);
  };

  // Expose role state and controls to descendants.
  return (
    <AuthContext.Provider value={{ role, loginAsDemo, switchRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Convenience hook for consumers of the shared authentication context.
export const useAuth = () => useContext(AuthContext);
