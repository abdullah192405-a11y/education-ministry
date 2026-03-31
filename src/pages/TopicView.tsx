import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    ChevronLeft, ChevronRight, Play, Eye, Clock,
    Trophy, BookOpen, Gamepad2, Users, Zap,
    FileText, Image as ImageIcon, AlignLeft, Video
} from "lucide-react";
import { useTopic } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "./NotFound";

const TopicView = () => {
    const { topicId } = useParams();
    const navigate = useNavigate();
    const { data: topic, isLoading, error } = useTopic(topicId || "");
    const subject = topic?.subject;
    const grade = subject?.grade;

    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [hasViewedAllMedia, setHasViewedAllMedia] = useState(false);

    // Normalize media data
    // Use useMemo to avoid reconstructing Blob URLs on every render
    const media = useMemo(() => {
        return (topic?.mediaItems || []).map((m: any) => {
            const type = (m.type || "").toLowerCase();
            let url = m.url;

            // If it's a PDF and has base64 data but no URL, construct an Object URL from a Blob
            // This is significantly faster for the browser to render than putting a 5MB base64 string directly in the DOM
            if (type === 'pdf' && !url && m.pdf_base64) {
                try {
                    const byteCharacters = atob(m.pdf_base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    url = URL.createObjectURL(blob);
                } catch (e) {
                    console.error("Error creating PDF blob:", e);
                    // Fallback to data URL if conversion fails
                    url = `data:application/pdf;base64,${m.pdf_base64}`;
                }
            }

            return {
                type,
                url,
                content: m.content,
                caption: m.caption || m.file_name || m.type
            };
        });
    }, [topic?.mediaItems, topicId]);

    // Track if all media has been viewed
    useEffect(() => {
        if (media.length > 0 && currentMediaIndex === media.length - 1) {
            setHasViewedAllMedia(true);
        }
    }, [currentMediaIndex, media]);

    if (isLoading) {
        return (
            <div className="min-h-screen font-cairo" dir="rtl">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4">
                        <Skeleton className="h-8 w-64 mb-6" />
                        <Skeleton className="h-32 w-full mb-8" />
                        <Skeleton className="h-[400px] w-full rounded-2xl" />
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !topic || !subject || !grade) {
        return <NotFound />;
    }

    const currentMedia = media[currentMediaIndex];
    const totalMedia = media.length;

    const handleNextMedia = () => {
        if (currentMediaIndex < totalMedia - 1) {
            setCurrentMediaIndex(currentMediaIndex + 1);
        }
    };

    const handlePrevMedia = () => {
        if (currentMediaIndex > 0) {
            setCurrentMediaIndex(currentMediaIndex - 1);
        }
    };

    const handleJoinChallenge = () => {
        navigate(`/grade/${grade.slug}/subject/${subject.id}/topic/${topic.id}/challenge`);
    };

    const getMediaIcon = (type: string) => {
        switch (type) {
            case "video": return <Video className="w-4 h-4" />;
            case "image": return <ImageIcon className="w-4 h-4" />;
            case "text": return <AlignLeft className="w-4 h-4" />;
            case "pdf": return <FileText className="w-4 h-4" />;
            default: return <BookOpen className="w-4 h-4" />;
        }
    };

    const renderMedia = () => {
        if (!currentMedia) return null;
        switch (currentMedia.type) {
            case "video":
                return (
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
                        <iframe
                            src={currentMedia.url}
                            title={currentMedia.caption}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                );
            case "image":
                return (
                    <div className="relative rounded-2xl overflow-hidden">
                        <img
                            src={currentMedia.url}
                            alt={currentMedia.caption}
                            className="w-full h-auto max-h-[500px] object-contain bg-muted"
                        />
                    </div>
                );
            case "text":
                return (
                    <Card className="p-6 md:p-8">
                        <div className="prose prose-lg dark:prose-invert max-w-none text-right leading-relaxed">
                            {currentMedia.content?.split('\n').map((paragraph: string, index: number) => {
                                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                                    return <h3 key={index} className="text-xl font-bold mt-6 mb-3">{paragraph.replace(/\*\*/g, '')}</h3>;
                                }
                                if (paragraph.startsWith('- ') || paragraph.startsWith('• ')) {
                                    return <li key={index} className="mr-4 mb-2">{paragraph.substring(2)}</li>;
                                }
                                if (paragraph.match(/^\d+\./)) {
                                    return <li key={index} className="mr-4 mb-2 list-decimal">{paragraph.substring(3)}</li>;
                                }
                                if (paragraph.startsWith('🔢') || paragraph.startsWith('💧') || paragraph.startsWith('♻️') || paragraph.startsWith('🔐') || paragraph.startsWith('🛡️') || paragraph.startsWith('⚠️') || paragraph.startsWith('💻') || paragraph.startsWith('🔤')) {
                                    return <p key={index} className="text-lg mb-2">{paragraph}</p>;
                                }
                                return paragraph.trim() ? <p key={index} className="mb-4">{paragraph}</p> : <br key={index} />;
                            })}
                        </div>
                    </Card>
                );
            case "pdf": {
                if (!currentMedia.url) {
                    return (
                        <div className="w-full h-[400px] flex flex-col items-center justify-center bg-muted/20 rounded-2xl border border-dashed text-center p-6">
                            <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-bold mb-2">ملف PDF غير متوفر</h3>
                            <p className="text-muted-foreground max-w-sm">
                                يبدو أن محتوى الملف لم يتم رفعه بشكل صحيح. يرجى التواصل مع المعلم لتحديث الدرس.
                            </p>
                        </div>
                    );
                }

                return (
                    <div className="w-full h-[65vh] min-h-[450px] rounded-2xl overflow-hidden border bg-background shadow-lg relative group transition-all duration-300">
                        {/* Loading indicator behind the PDF */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/10 z-0">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                            <p className="text-muted-foreground font-medium text-sm md:text-base">جاري تحميل ملف PDF...</p>
                        </div>

                        {/* PDF Viewer - using object for better compatibility, falls back to iframe */}
                        <object
                            data={currentMedia.url}
                            type="application/pdf"
                            className="w-full h-full relative z-10 bg-transparent"
                        >
                            <iframe
                                src={currentMedia.url}
                                className="w-full h-full border-none"
                                title={currentMedia.caption || "عرض ملف PDF"}
                            />
                        </object>

                        {/* Enhanced controls on hover */}
                        <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-xl backdrop-blur-sm">
                            <Button size="sm" variant="secondary" className="shadow-md font-bold" asChild>
                                <a href={currentMedia.url} target="_blank" rel="noopener noreferrer">
                                    <FileText className="w-4 h-4 ml-2" />
                                    فتح في نافذة جديدة
                                </a>
                            </Button>
                        </div>
                    </div>
                );
            }
            default: return null;
        }
    };

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-b from-background to-muted/30" dir="rtl">
            <Header />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4">
                    {/* Breadcrumb */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
                    >
                        <Link to="/grades" className="hover:text-primary transition-colors">
                            الصفوف
                        </Link>
                        <span>/</span>
                        <Link to={`/grade/${grade.slug}`} className="hover:text-primary transition-colors">
                            {grade.name}
                        </Link>
                        <span>/</span>
                        <Link to={`/grade/${grade.slug}/subject/${subject.id}`} className="hover:text-primary transition-colors">
                            {subject.icon} {subject.name}
                        </Link>
                        <span>/</span>
                        <span className="text-foreground">{topic.title}</span>
                    </motion.div>

                    {/* Content Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <span
                                className="px-3 py-1 rounded-full text-sm font-medium"
                                style={{
                                    backgroundColor: `${subject.color}20`,
                                    color: subject.color
                                }}
                            >
                                {subject.icon} {subject.name}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground text-sm">
                                <Eye className="w-4 h-4" />
                                {(topic.views || 0).toLocaleString("ar-SA")} مشاهدة
                            </span>
                            {topic.duration && (
                                <span className="flex items-center gap-1 text-muted-foreground text-sm">
                                    <Clock className="w-4 h-4" />
                                    {topic.duration}
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black mb-3">{topic.title}</h1>
                        <p className="text-lg text-muted-foreground">{topic.description}</p>
                    </motion.div>

                    {/* Main Content Area */}
                    <div className="space-y-6">
                        {/* Progress Bar */}
                        <div className="flex items-center gap-4 mb-4">
                            <span className="text-sm text-muted-foreground">
                                {currentMediaIndex + 1} من {totalMedia}
                            </span>
                            <Progress value={((currentMediaIndex + 1) / totalMedia) * 100} className="flex-1 h-2 rotate-180" />
                        </div>

                        {/* Media Content */}
                        <div className="max-w-4xl mx-auto">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentMediaIndex}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    {renderMedia()}
                                </motion.div>
                            </AnimatePresence>

                            {/* Caption */}
                            {currentMedia?.caption && (
                                <p className="text-center text-muted-foreground mt-4 text-lg">
                                    {currentMedia.caption}
                                </p>
                            )}
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between max-w-4xl mx-auto mt-8">
                            <Button
                                variant="outline"
                                onClick={handlePrevMedia}
                                disabled={currentMediaIndex === 0}
                                className="gap-1 md:gap-2 h-8 px-3 text-xs md:h-10 md:px-4 md:text-base"
                            >
                                <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                                السابق
                            </Button>

                            <div className="flex flex-wrap justify-center gap-2 max-h-[200px] overflow-y-auto p-2">
                                {media.map((item: any, index: number) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentMediaIndex(index)}
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border-2 ${index === currentMediaIndex
                                            ? "bg-primary text-white border-primary scale-110 shadow-md"
                                            : index <= currentMediaIndex
                                                ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                                : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                                            }`}
                                        title={item.type}
                                    >
                                        {getMediaIcon(item.type)}
                                    </button>
                                ))}
                            </div>

                            {currentMediaIndex < totalMedia - 1 ? (
                                <Button onClick={handleNextMedia} className="gap-1 md:gap-2 h-8 px-3 text-xs md:h-10 md:px-4 md:text-base">
                                    التالي
                                    <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleJoinChallenge}
                                    variant="hero"
                                    className="gap-1 md:gap-2 h-8 px-3 text-xs md:h-10 md:px-4 md:text-base"
                                >
                                    <Gamepad2 className="w-3 h-3 md:w-4 md:h-4" />
                                    انضم للتحدي
                                </Button>
                            )}
                        </div>

                        {/* Quick Challenge Access */}
                        {hasViewedAllMedia && currentMediaIndex < totalMedia - 1 && (
                            <div className="text-center mt-4">
                                <Button variant="ghost" onClick={handleJoinChallenge} className="gap-2">
                                    <Play className="w-4 h-4" />
                                    الانتقال للتحدي مباشرة
                                </Button>
                            </div>
                        )}

                        {/* Challenge CTA Card */}
                        {currentMediaIndex === totalMedia - 1 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="max-w-2xl mx-auto mt-8"
                            >
                                <Card className="p-6 md:p-8 bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/5 border-primary/20">
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                                            <Trophy className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-3">🎮 انضم للتحدي</h3>
                                        <p className="text-muted-foreground mb-6">
                                            اختبر معلوماتك بطريقة ممتعة! يمكنك اللعب بمفردك أو مع أصدقائك
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                            <div className="p-4 rounded-xl bg-background/50 border">
                                                <Users className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                                                <div className="font-medium">تحدي جماعي</div>
                                                <div className="text-xs text-muted-foreground">نافس أصدقاءك</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-background/50 border">
                                                <Zap className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                                                <div className="font-medium">تحدي فردي</div>
                                                <div className="text-xs text-muted-foreground">اختبر نفسك</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground mb-6">
                                            <span className="px-3 py-1 rounded-full bg-muted">💡 أنشطة تفاعلية</span>
                                            <span className="px-3 py-1 rounded-full bg-muted">🎮 ألعاب تعليمية</span>
                                            <span className="px-3 py-1 rounded-full bg-muted">🏆 شارات ومكافآت</span>
                                        </div>

                                        <Button
                                            onClick={handleJoinChallenge}
                                            size="lg"
                                            variant="hero"
                                            className="gap-2 text-lg h-14 px-8"
                                        >
                                            <Gamepad2 className="w-5 h-5" />
                                            ابدأ التحدي الآن
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default TopicView;
