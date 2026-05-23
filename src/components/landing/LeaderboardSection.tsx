
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Star, Crown } from "lucide-react";
import { useGlobalLeaderboard } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/contexts/LanguageContext";

const LeaderboardSection = () => {
    const { data: results = [], isLoading } = useGlobalLeaderboard(5);
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <section className="py-20 bg-muted/30">
                <div className="container mx-auto px-4 text-center">
                    <Skeleton className="h-12 w-64 mx-auto mb-12" />
                    <div className="max-w-3xl mx-auto space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (results.length === 0) return null;

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Trophy className="w-6 h-6 text-amber-500" />;
            case 1: return <Medal className="w-6 h-6 text-slate-400" />;
            case 2: return <Medal className="w-6 h-6 text-amber-700" />;
            default: return <Star className="w-5 h-5 text-muted-foreground/50" />;
        }
    };

    const getRankColor = (index: number) => {
        switch (index) {
            case 0: return "bg-amber-500/10 border-amber-500/20";
            case 1: return "bg-slate-400/10 border-slate-400/20";
            case 2: return "bg-amber-700/10 border-amber-700/20";
            default: return "bg-muted border-border";
        }
    };

    return (
        <section className="py-20 bg-muted/30 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 blur-3xl translate-y-1/2 -translate-x-1/2 rounded-full" />

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-black mb-4">
                        {t("leaderboard.title")} <span className="text-primary">{t("leaderboard.titleHighlight")}</span>
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        {t("leaderboard.description")}
                    </p>
                </motion.div>

                <div className="max-w-3xl mx-auto space-y-4">
                    {results.map((result, index) => (
                        <motion.div
                            key={result.id}
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className={`overflow-hidden border-2 transition-all hover:scale-[1.02] ${getRankColor(index)}`}>
                                <CardContent className="p-4 md:p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4 md:gap-6">
                                        {/* Rank */}
                                        <div className="flex flex-col items-center justify-center w-10 md:w-12 h-10 md:h-12 rounded-xl bg-background shadow-inner font-black text-lg">
                                            {index + 1}
                                        </div>

                                        {/* User Info */}
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="relative">
                                                <div className="w-12 md:w-16 h-12 md:h-16 rounded-2xl bg-muted overflow-hidden border-2 border-background">
                                                    <img
                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${result.user?.name || result.user_id}`}
                                                        alt={result.user?.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                {index === 0 && (
                                                    <div className="absolute -top-3 -right-3">
                                                        <Crown className="w-7 h-7 text-amber-500 fill-amber-500/20 rotate-12 drop-shadow-md" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg md:text-xl text-foreground">
                                                    {result.user?.name || t("leaderboard.defaultStudent")}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                                    <span>{result.level || t("leaderboard.defaultLevel")}</span>
                                                    <span>•</span>
                                                    <span>{result.accuracy || 100}% {t("leaderboard.accuracy")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="text-2xl md:text-3xl font-black text-primary">
                                            {result.score}
                                        </div>
                                        <div className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                            {t("leaderboard.points")}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default LeaderboardSection;
