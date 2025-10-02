import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({children}) => {
    const token=localStorage.getItem("token");
    if(!token){
        return <Navigate to="/log-in" />
    }
    return children;
}

export default ProtectedRoute