import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AUTH_TOKEN_KEY, API_BASE_URL } from '../constants';
import { useAuth } from './AuthContext';

interface SocketContextData {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextData>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    // Determine the base url for the socket. It will be the same domain as the API but using ws://
    // For development, API_BASE_URL is usually 'http://localhost:5000/api', so we need the origin.
    let socketUrl = '';
    try {
      const urlObj = new URL(API_BASE_URL);
      socketUrl = urlObj.origin;
    } catch {
      socketUrl = window.location.origin; // fallback
    }

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'], // Ensure we fall back if websocket fails
    });

    newSocket.on('connect', () => {
      console.log('Real-time connection established');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Real-time connection lost');
      setIsConnected(false);
    });

    // We can also listen globally for data updates to trigger toast notifications or broad refreshes
    newSocket.on('data_updated', (payload) => {
      // In a real robust app, you might use a global state manager or custom event bus
      // For now, we can dispatch a custom DOM event that components (like Dashboard) can listen to
      window.dispatchEvent(new CustomEvent('OpsFlowDataUpdate', { detail: payload }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
