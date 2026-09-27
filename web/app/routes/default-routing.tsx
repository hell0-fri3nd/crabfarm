
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router';
import InfiniteProgressBar from '~/components/infinite-progress';
import type { RootState } from '~/store/store';

const DefaultRouting = () => {
  const { isAuthenticated,status, accessExpired, refreshExpired } = useSelector((state: RootState) => state.auth);
  const location = useLocation()

  if (status === 'loading' ) {
    return (  
      <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
        <div >
          <InfiniteProgressBar className="scale-90"/>
        </div>
      </div>
    );
  }

  if (!accessExpired){
    return (
      <Navigate 
      to="/access-token" 
      replace
      />
    );
  }

  if (!isAuthenticated && !accessExpired && !refreshExpired) {
    return <Navigate to="/auth" replace />;
  }

  const from = location.state?.from?.pathname || "/page/dashboard";
  return <Navigate to={from} replace />;
}

export default DefaultRouting