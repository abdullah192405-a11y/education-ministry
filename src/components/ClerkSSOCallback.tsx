import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";

/**
 * Completes the Clerk OAuth redirect handshake only.
 * After success, Clerk navigates to redirectUrlComplete (/sso-complete).
 */
const ClerkSSOCallback = () => {
    return (
        <div
            className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center"
            dir="rtl"
        >
            <AuthenticateWithRedirectCallback
                signInFallbackRedirectUrl="/sso-complete"
                signUpFallbackRedirectUrl="/sso-complete"
                signInForceRedirectUrl="/sso-complete"
                signUpForceRedirectUrl="/sso-complete"
                continueSignUpUrl="/sso-complete"
            />
            <div id="clerk-captcha" />
            <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <h3 className="text-xl font-bold">جارٍ إكمال تسجيل الدخول...</h3>
                <p className="text-muted-foreground">يرجى الانتظار قليلاً</p>
            </div>
        </div>
    );
};

export default ClerkSSOCallback;
