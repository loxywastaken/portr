import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullPageLoader } from '@/components/common/FullPageLoader';

export default function AuthCallback() {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void (async () => {
      await refresh();
      if (active) navigate('/servers', { replace: true });
    })();
    return () => {
      active = false;
    };
  }, [refresh, navigate]);

  return <FullPageLoader label="Signing you in" />;
}
