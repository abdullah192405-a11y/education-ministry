import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const navigate = useNavigate();
    const { data: user, isLoading } = useUser();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                navigate("/login", { replace: true });
                return;
            }

            if (allowedRoles && allowedRoles.length > 0) {
                const userRole = user.role?.toUpperCase();
                const isAllowed = allowedRoles.some(role => role.toUpperCase() === userRole);

                if (!isAllowed) {
                    // Redirect to their own dashboard if they try to access something they shouldn't
                    if (userRole === "SUPERADMIN") {
                        navigate("/dashboard/superadmin", { replace: true });
                    } else if (userRole === "ADMIN" || userRole === "مسؤول") {
                        navigate("/dashboard/admin", { replace: true });
                    } else if (userRole === "TEACHER" || userRole === "معلم" || userRole === "معلمة") {
                        navigate("/dashboard/teacher", { replace: true });
                    } else {
                        navigate("/dashboard/student", { replace: true });
                    }
                }
            }
        }
    }, [user, isLoading, navigate, allowedRoles]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-4xl space-y-8 text-center">
                    <Skeleton className="h-12 w-48 mx-auto mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-64 rounded-xl" />
                        <Skeleton className="h-64 rounded-xl" />
                        <Skeleton className="h-64 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = user.role?.toUpperCase();
        const isAllowed = allowedRoles.some(role => role.toUpperCase() === userRole);
        if (!isAllowed) return null;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
