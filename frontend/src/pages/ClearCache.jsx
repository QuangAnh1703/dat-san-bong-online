import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClearCache() {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();

    // Clear IndexedDB
    if (window.indexedDB) {
      indexedDB.databases?.().then(dbs => {
        dbs.forEach(db => indexedDB.deleteDatabase(db.name));
      });
    }

    console.log('✅ Cache cleared!');

    // Redirect to register after 1 second
    setTimeout(() => {
      navigate('/auth/register');
    }, 1000);
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontSize: '18px',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>🔄 Clearing cache...</h2>
        <p>Redirecting to register...</p>
      </div>
    </div>
  );
}
