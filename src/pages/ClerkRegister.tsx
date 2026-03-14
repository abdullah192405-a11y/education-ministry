import { useNavigate, Link } from "react-router-dom";
import { useState, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail, User, AlertCircle, UserPlus, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

// Clerk is disabled by default - only enable if you have a valid publishable key
// To enable: set CLERK_ENABLED = true and add a valid key to .env
const CLERK_ENABLED = false; // Change to true only with a valid Clerk publishable key

// Google OAuth is enabled
const GOOGLE_OAUTH_ENABLED = true; // Enabled with Google Cloud credentials

type UserRole = "STUDENT" | "TEACHER";

const ClerkRegister = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // If Clerk is available and enabled, show Clerk UI
  if (CLERK_ENABLED) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <ClerkSignUpComponent 
              appearance={{
                baseTheme: undefined,
                elements: {
                  rootBox: "w-full",
                  card: "w-full shadow-xl rounded-lg",
                },
              }}
              routing="path"
              path="/register"
              signInUrl="/login"
              fallbackRedirectUrl="/dashboard"
              redirectUrl="/dashboard"
            />
          </Suspense>
        </div>
      </div>
    );
  }

  // Fallback to Supabase auth
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("يرجى إدخال الاسم");
      return;
    }
    if (!email.trim()) {
      setError("يرجى إدخال البريد الإلكتروني");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقتين");
      return;
    }

    setIsLoading(true);

    try {
      const now = new Date().toISOString();
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          email,
          name,
          role: role,
          verified: false,
          is_active: true,
          details: role === "STUDENT" ? "طالب جديد" : "معلم جديد",
          updated_at: now,
        })
        .select()
        .single();

      if (createError) {
        if (createError.message.includes("duplicate")) {
          setError("هذا البريد الإلكتروني مسجل بالفعل");
        } else {
          setError("فشل التسجيل: " + createError.message);
        }
        setIsLoading(false);
        return;
      }

      localStorage.setItem("edu_user", JSON.stringify({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      }));
      queryClient.setQueryData(["current_user"], newUser);
      
      setTimeout(() => navigate("/dashboard"), 1000);
    } catch (err) {
      console.error("Register error:", err);
      setError("حدث خطأ أثناء التسجيل");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">إنشاء حساب جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="flex gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">الاسم</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="الاسم الكامل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">الدور</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="STUDENT">طالب</option>
                <option value="TEACHER">معلم</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="password"
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">تأكيد كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="password"
                  placeholder="تأكيد كلمة المرور"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "جاري التسجيل..." : <><UserPlus className="mr-2 h-4 w-4" /> إنشاء حساب</>}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">أو</span>
              </div>
            </div>

            <div className="relative group">
              <Button 
                type="button"
                variant="outline"
                className="w-full"
                disabled={false}
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: `${window.location.origin}/`,
                      },
                    });
                    if (error) {
                      console.error('Google login error:', error);
                      setError('فشل تسجيل الدخول بواسطة جوجل');
                    }
                  } catch (err) {
                    console.error('OAuth error:', err);
                    setError('حدث خطأ أثناء محاولة تسجيل الدخول');
                  }
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                التسجيل باستخدام Google
              </Button>
              <div className="absolute left-0 right-0 bottom-full mb-2 bg-gray-800 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                <div className="flex gap-1">
                  <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  <span>يرجى تفعيل Google في لوحة Supabase</span>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                هل لديك حساب بالفعل؟{" "}
                <Link to="/login" className="text-blue-600 hover:underline font-medium">
                  سجل الدخول
                </Link>
              </p>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              هل لديك حساب بالفعل؟{" "}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                سجل الدخول
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClerkRegister;
