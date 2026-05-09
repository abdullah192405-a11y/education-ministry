import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardRedirect = () => {
    const navigate = useNavigate();
    const { data: user, isLoading } = useUser();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                navigate("/login");
                return;
            }

            const role = user.role?.toUpperCase();
            if (role === "SUPERADMIN") {
                navigate("/dashboard/superadmin");
            } else if (role === "ADMIN" || role === "مسؤول") {
                navigate("/dashboard/admin");
            } else if (role === "TEACHER" || role === "معلم" || role === "معلمة") {
                navigate("/dashboard/teacher");
            } else {
                navigate("/dashboard/student");
            }
        }
    }, [user, isLoading, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center p-8">
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
};

export default DashboardRedirect;
