import React from 'react'
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router';
import type { RootState } from '../../store/store';
import InfiniteProgressBar from '../infinite-progress';

const ProtectedRoutes = ({ children }: { children: React.ReactNode }) => {

  const { isAuthenticated, status, accessExpired, refreshExpired } = useSelector((state: RootState) => state.auth);

  if (status === 'loading' ) {
    return (  
      <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
        <div >
          <InfiniteProgressBar className="scale-90"/>
        </div>
      </div>
    );
  }

  if (!accessExpired && refreshExpired){
    return (
      <Navigate 
        to="/access-token" 
        replace
      />
    );
  }

  // Not logged in OR refresh token expired → login
  if (!isAuthenticated && !refreshExpired) {
    return <Navigate to="/auth/" replace />;
  }

  return children;
}

export const DefaultRoutes = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, status, refreshExpired, accessExpired } = useSelector((state: RootState) => state.auth);

  if (status === 'loading') {
    return (  
      <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
        <div >
          <InfiniteProgressBar className="scale-90"/>
        </div>
      </div>
    );
  }

  if (!accessExpired && refreshExpired){
    return (
      <Navigate 
        to="/access-token" 
        replace
      />
    );
  }

  if (isAuthenticated && refreshExpired && accessExpired) {
    return (
      <Navigate 
        to="/page/dashboard" 
        replace
      />
    );
  }

  return children;
}

export const PinRoute = ({ children }: { children: React.ReactNode }) => {
  
  const { accessExpired, refreshExpired, status } = useSelector(
    (state: RootState) => state.auth
  );

  // Only allow PIN page if access token is valid but refresh expired
  if (!accessExpired && refreshExpired) {
    return <>{children}</>; // render PIN page
  }

  const location = useLocation();
  const from = location.state?.from?.pathname || "/page/dashboard";
  return <Navigate to={from} replace />;
}

export default ProtectedRoutes