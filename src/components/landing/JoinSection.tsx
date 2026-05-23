import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, BookOpen, Users, Trophy, Gamepad2, ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "@/contexts/LanguageContext";

const JoinSection = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const { t, dir } = useTranslation();
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const handlePinChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/\D/g, "").slice(0, 6);
    setPin(numericValue);
    setError("");
  };

  const handleJoin = () => {
    if (pin.length !== 6) {
      setError(t("joinSection.pinError"));
      return;
    }
    navigate(`/join/${pin}`);
  };


  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-secondary" />

      {/* Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left Side - Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-white"
            >
              <h2 className="text-3xl md:text-5xl font-black mb-6">
                {t("joinSection.title")} <span className="text-amber-300">{t("joinSection.titleHighlight")}</span> {t("joinSection.titleSuffix")}
              </h2>
              <p className="text-white/80 text-lg mb-8">
                {t("joinSection.description")}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <BookOpen className="w-8 h-8 text-white mx-auto mb-2" />
                  <div className="text-2xl font-black text-white">50+</div>
                  <div className="text-white/70 text-sm">{t("joinSection.educationalContent")}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <Gamepad2 className="w-8 h-8 text-white mx-auto mb-2" />
                  <div className="text-2xl font-black text-white">200+</div>
                  <div className="text-white/70 text-sm">{t("joinSection.interactiveChallenges")}</div>
                </div>
              </div>

              <Button
                asChild
                size="lg"
                className="h-14 bg-white text-primary hover:bg-white/90 font-bold text-lg px-8"
              >
                <Link to="/grades">
                  <Play className="w-5 h-5" />
                  {t("joinSection.exploreContent")}
                </Link>
              </Button>
            </motion.div>

            {/* Right Side - Join Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-white rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{t("joinSection.joinChallenge")}</h3>
                  <p className="text-gray-500">{t("joinSection.enterPin")}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="______"
                      value={pin}
                      onChange={(e) => handlePinChange(e.target.value)}
                      className="text-center text-3xl font-black h-16 tracking-[0.4em] placeholder:tracking-normal placeholder:text-xl border-2 focus:border-primary"
                      maxLength={6}
                      inputMode="numeric"
                    />
                    {error && (
                      <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
                    )}
                  </div>

                  <Button
                    onClick={handleJoin}
                    size="lg"
                    className="w-full h-14 text-lg gap-2"
                    disabled={pin.length !== 6}
                  >
                    <ArrowIcon className="w-5 h-5" />
                    {t("joinSection.joinButton")}
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-gray-400">
                      {t("joinSection.orJoinWithoutPin")} <Link to="/join" className="text-primary hover:underline font-medium">{t("joinSection.joinWithoutPin")}</Link>
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-2 text-center">
                  <div>
                    <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                    <span className="text-xs text-gray-500">{t("joinSection.prizes")}</span>
                  </div>
                  <div>
                    <Gamepad2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                    <span className="text-xs text-gray-500">{t("joinSection.games")}</span>
                  </div>
                  <div>
                    <Users className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                    <span className="text-xs text-gray-500">{t("joinSection.team")}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoinSection;
