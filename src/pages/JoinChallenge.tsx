import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Users, Trophy, Gamepad2, Sparkles, ArrowLeft
} from "lucide-react";
import { useChallengeSession, useJoinChallengeSession, useUser } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

const JoinChallenge = () => {
    const { pin: urlPin } = useParams();
    const navigate = useNavigate();

    const [pin, setPin] = useState(urlPin || "");
    const [playerName, setPlayerName] = useState("");
    const [error, setError] = useState("");
    const [step, setStep] = useState<"pin" | "name">(urlPin ? "name" : "pin");

    const { data: session, isLoading, refetch } = useChallengeSession(pin);
    const joinSessionMutation = useJoinChallengeSession();
    const { data: currentUser } = useUser();
    const [isJoining, setIsJoining] = useState(false);

    const handlePinSubmit = async () => {
        if (pin.length !== 6) {
            setError("الرمز يجب أن يتكون من 6 أرقام");
            return;
        }

        console.log("Validating PIN logic in click handler:", pin);

        // Manual query to be 100% sure we bypass React Query cache or refetch logic issues
        try {
            const { data: directData, error: directError } = await supabase
                .from("challenge_sessions")
                .select("*")
                .eq("pin", pin)
                .single();

            console.log("Supabase direct query result:", directData, directError);

            if (!directData) {
                setError(`رمز التحدي غير صالح للمحاولة المباشرة: ${directError?.message || 'غير موجود'}`);
                return;
            }

            if (directData.status === "FINISHED") {
                setError("عذراً، هذا التحدي قد انتهى بالفعل.");
                return;
            }
        } catch (e: any) {
            setError(`رسالة الخطأ المباشر: ${e.message}`);
            return;
        }

        const { data: validSession, error: refetchError } = await refetch();
        console.log("React Query refetch result:", validSession, refetchError);

        if (!validSession) {
            setError("رمز التحدي غير صالح أو انتهت صلاحيته");
            return;
        }

        if (validSession.status === "FINISHED") {
            setError("هذا التحدي انتهى.");
            return;
        }

        setError("");
        setStep("name");
    };

    const handleJoin = async () => {
        if (!playerName.trim()) {
            setError("الرجاء إدخال اسمك");
            return;
        }

        if (!session || !session.id) {
            setError("لم يتم العثور على بيانات الجلسة. حاول مرة أخرى.");
            setIsJoining(false);
            return;
        }

        setIsJoining(true);
        try {
            await joinSessionMutation.mutateAsync({
                sessionId: session.id,
                userId: currentUser?.id,
                name: playerName,
            });

            const topicIdToUse = session.topic_id || session.topicId;
            // Navigate to the challenge
            if (topicIdToUse) {
                const categoryToUse = (session.category || 'activities').toLowerCase();
                navigate(`/grade/${session.topic?.grade_id || 'grade'}/subject/${session.topic?.subject_id || 'subject'}/topic/${topicIdToUse}/challenge/group/${categoryToUse}/${pin}?name=${encodeURIComponent(playerName)}`);
            } else {
                setError("لم يتم العثور على موضوع لهذا التحدي.");
            }
        } catch (error: any) {
            console.error("Failed to join session", error);
            setError(`حدث خطأ أثناء الانضمام: ${error.message || 'قد يكون الرمز غير صالح'}`);
        } finally {
            setIsJoining(false);
        }
    };

    const handlePinChange = (value: string) => {
        // Only allow numbers
        const numericValue = value.replace(/\D/g, "").slice(0, 6);
        setPin(numericValue);
        setError("");
    };

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-b from-background via-background to-primary/5">
            <Header />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md mx-auto"
                    >
                        {/* Header */}
                        <div className="text-center mb-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring" }}
                                className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 shadow-xl"
                            >
                                <Gamepad2 className="w-10 h-10 text-white" />
                            </motion.div>
                            <h1 className="text-3xl font-black mb-2">انضم للتحدي</h1>
                            <p className="text-muted-foreground">
                                {step === "pin" ? "أدخل رمز التحدي للانضمام" : "أدخل اسمك للمتابعة"}
                            </p>
                        </div>

                        <Card className="p-8">
                            {step === "pin" ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <div className="mb-6">
                                        <label className="text-sm font-medium mb-2 block">رمز التحدي (PIN)</label>
                                        <Input
                                            type="text"
                                            placeholder="______"
                                            value={pin}
                                            onChange={(e) => handlePinChange(e.target.value)}
                                            className="text-center text-4xl font-black h-20 tracking-[0.5em] placeholder:tracking-normal placeholder:text-2xl"
                                            maxLength={6}
                                            inputMode="numeric"
                                        />
                                        {error && (
                                            <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
                                        )}
                                    </div>

                                    <Button
                                        onClick={handlePinSubmit}
                                        size="lg"
                                        className="w-full gap-2 h-14 text-lg"
                                        disabled={pin.length !== 6}
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        متابعة
                                    </Button>

                                    {/* Info */}
                                    <div className="mt-6 p-4 rounded-xl bg-muted/50 text-center">
                                        <p className="text-sm text-muted-foreground">
                                            احصل على رمز التحدي من منظم اللعبة
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    {/* Challenge Info */}
                                    <div className="mb-6 p-4 rounded-xl bg-primary/10 text-center">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <Trophy className="w-5 h-5 text-primary" />
                                            <span className="font-medium">التحدي رقم</span>
                                        </div>
                                        <div className="text-3xl font-black text-primary tracking-wider">{pin}</div>
                                    </div>

                                    <div className="mb-6">
                                        <label className="text-sm font-medium mb-2 block">اسمك في اللعبة</label>
                                        <Input
                                            type="text"
                                            placeholder="أدخل اسمك"
                                            value={playerName}
                                            onChange={(e) => {
                                                setPlayerName(e.target.value);
                                                setError("");
                                            }}
                                            className="text-center text-xl h-14"
                                            maxLength={20}
                                        />
                                        {error && (
                                            <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
                                        )}
                                    </div>

                                    <Button
                                        onClick={handleJoin}
                                        size="lg"
                                        variant="hero"
                                        className="w-full gap-2 h-14 text-lg"
                                        disabled={!playerName.trim() || isJoining}
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        {isJoining ? "جاري الانضمام..." : "انضم للتحدي"}
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        className="w-full mt-4"
                                        onClick={() => setStep("pin")}
                                    >
                                        تغيير الرمز
                                    </Button>
                                </motion.div>
                            )}
                        </Card>

                        {/* Features */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mt-8 grid grid-cols-3 gap-4"
                        >
                            <div className="text-center p-4 rounded-xl bg-card border">
                                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                                <div className="text-xs text-muted-foreground">تحدي جماعي</div>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-card border">
                                <Trophy className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                                <div className="text-xs text-muted-foreground">فز بجوائز</div>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-card border">
                                <Gamepad2 className="w-6 h-6 mx-auto mb-2 text-secondary" />
                                <div className="text-xs text-muted-foreground">ألعاب ممتعة</div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default JoinChallenge;
