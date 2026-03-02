import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * RoleRoute — Guard component that restricts access by user role.
 *
 * If not logged in → /login
 * If wrong role → redirects to role-appropriate home
 * If provider + pending → allows access (pages handle the pending state themselves)
 */
export default function RoleRoute({ children, allowedRoles = [] }) {
    const { currentUser, userRole } = useAuth();

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        if (userRole === 'admin') return <Navigate to="/admin" replace />;
        if (userRole === 'provider') return <Navigate to="/provider" replace />;
        return <Navigate to="/" replace />;
    }

    return children;
}
