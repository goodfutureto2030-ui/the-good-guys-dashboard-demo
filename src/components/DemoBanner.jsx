import { useAuth } from '../screens/AuthContext';

// Provides role-switching controls while a local demo role is active.
export function DemoBanner() {
  // Context supplies both the current role and session actions.
  const { role, switchRole, logout } = useAuth();

  // Keep the dashboard unobstructed when no demo role is selected.
  if (!role) return null;

  // Inline styles keep this lightweight banner independent of page layout.
  return (
    <div style={{
      background: '#1e293b',
      color: '#fff',
      padding: '10px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '14px'
    }}>
      <span>
        Demo Mode — Currently viewing as: <strong>{role.toUpperCase()}</strong>
      </span>
      {/* The switch button changes perspective; exit clears the demo session. */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={switchRole} style={{ padding: '4px 10px', cursor: 'pointer' }}>
          Switch to {role === 'admin' ? 'User' : 'Admin'} View
        </button>
        <button onClick={logout} style={{ padding: '4px 10px', cursor: 'pointer' }}>
          Exit Demo
        </button>
      </div>
    </div>
  );
}
