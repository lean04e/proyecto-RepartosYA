import { useState, useEffect } from 'react';
import Login from './pages/login';
import AdminDashboard from './pages/adminDashboard';

function getStoredAdminSession() {
    const storedSession = sessionStorage.getItem('repartosya_session');
    if (!storedSession) {
        return null;
    }

    try {
        const session = JSON.parse(storedSession);
        return session.user?.role === 'admin' ? session : null;
    } catch {
        sessionStorage.removeItem('repartosya_session');
        return null;
    }
}

function App() {
    const [session, setSession] = useState(getStoredAdminSession);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('repartosya_theme') === 'dark';
    });

    useEffect(() => {
        document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
        localStorage.setItem('repartosya_theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    const handleLoginSuccess = (newSession) => {
        sessionStorage.setItem('repartosya_session', JSON.stringify(newSession));
        setSession(newSession);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('repartosya_session');
        setSession(null);
    };

    const handleToggleTheme = () => {
        setIsDarkMode((prevMode) => !prevMode);
    };

    return (
        <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0 }}>
            {!session ? (
                <Login onLoginSuccess={handleLoginSuccess} />
            ) : (
                <AdminDashboard
                    onLogout={handleLogout}
                    isDarkMode={isDarkMode}
                    onToggleTheme={handleToggleTheme}
                />
            )}
        </div>
    );
}

export default App;