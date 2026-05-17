import { createContext, useContext, useEffect, useState } from 'react';
import { initSocket, disconnectSocket } from '../api/SocketClient';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, token } = useAuth();
  const [socket,    setSocket]    = useState(null); //  state, pas ref
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user?.id_user || !token) return;

    const s = initSocket(user.id_user, token);

    s.on('connect', () => {
      setConnected(true);
      setSocket(s); //  re-render déclenché → les enfants reçoivent le socket
    });

    s.on('disconnect', () => setConnected(false));

    // Si déjà connecté (reconnexion rapide)
    if (s.connected) {
      setSocket(s);
      setConnected(true);
    }

    return () => {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
    };
  }, [user?.id_user, token]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}