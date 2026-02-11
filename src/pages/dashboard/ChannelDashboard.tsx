import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Trophy, Star, Target, Clock, Brain, Flame, Medal,
    BookOpen, History, Settings, User, LogOut, Bell,
    ChevronLeft, Play, Download, Share2, Calendar,
    TrendingUp, Award, Zap, Crown, CheckCircle, XCircle,
    BarChart3, PieChart, Activity, Plus, Edit, Trash2,
    Users, Eye, Video, Image, FileText, Send, Copy,
    Gamepad2, LayoutDashboard, Library, ChartBar, Cog,
    ExternalLink, Upload, Sparkles, ListChecks, AlertTriangle,
    X, Settings2, CheckCircle2, MapPin, Shield
} from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { generatePin } from "@/data/challengeTypes";
import ContentEditor from "@/components/dashboard/ContentEditor";
import type { EducationalContent, ContentMedia, QuizQuestion } from "@/data/channelsData";
import type { ChallengeQuestion } from "@/data/challengeTypes";

// Extended content type for dashboard
interface DashboardContent {
    id: number;
    title: string;
    description: string;
    thumbnail: string;
    views: number;
    quizCount: number;
    mediaCount: number;
    status: "published" | "draft";
    createdAt: string;
    challengesTaken: number;
    avgScore: number;
    targetAudience?: "all" | "children" | "adults";
    duration?: string;
    media?: ContentMedia[];
    quiz?: QuizQuestion[];
    challengeItems?: ChallengeQuestion[];
}

// Mock Channel Owner Data
const mockChannelData = {
    id: 1,
    name: "القناة الرسمية",
    slug: "official-channel",
    type: "ministry",
    logo: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=400&fit=crop",
    verified: true,
    category: "صحة",
    followers: 125000,
    rating: 4.9,
    totalViews: 458000,
    totalChallenges: 1250,
    activeUsers: 3420
};

const initialMockContents: DashboardContent[] = [
    {
        id: 1,
        title: "كيف نحمي أنفسنا من الجراثيم",
        description: "تعلم الطرق الصحيحة لحماية نفسك وعائلتك من الجراثيم",
        thumbnail: "https://images.unsplash.com/photo-1584362917165-526a968579e8?w=400&h=300&fit=crop",
        views: 45000,
        quizCount: 7,
        mediaCount: 9,
        status: "published",
        createdAt: "2024-01-15",
        challengesTaken: 890,
        avgScore: 78,
        targetAudience: "all",
        duration: "8 دقائق",
        media: [
            { type: "video", url: "https://www.youtube.com/embed/3-3yrr5p5xA", caption: "فيديو توعوي عن غسل اليدين" },
            { type: "image", url: "https://images.unsplash.com/photo-1584362917165-526a968579e8?w=800", caption: "خطوات غسل اليدين" },
            { type: "text", content: "الجراثيم كائنات دقيقة لا يمكن رؤيتها بالعين المجردة..." }
        ],
        quiz: [],
        challengeItems: [
            { id: 1, type: "multiple_choice", question: "كم ثانية يجب غسل اليدين؟", options: ["5 ثواني", "10 ثواني", "20 ثانية", "دقيقة"], correctAnswer: 2, explanation: "20 ثانية على الأقل", points: 100, timeLimit: 20 },
            { id: 2, type: "true_false", question: "يمكن للجراثيم الانتقال عبر المصافحة", options: ["صح", "خطأ"], correctAnswer: 0, explanation: "نعم تنتقل عبر التلامس", points: 50, timeLimit: 15 }
        ]
    },
    {
        id: 2,
        title: "التغذية الصحية للأطفال",
        description: "دليلك الشامل لتغذية طفلك بطريقة صحية ومتوازنة",
        thumbnail: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=300&fit=crop",
        views: 32000,
        quizCount: 2,
        mediaCount: 2,
        status: "published",
        createdAt: "2024-01-10",
        challengesTaken: 560,
        avgScore: 82,
        targetAudience: "children",
        duration: "6 دقائق",
        media: [
            { type: "image", url: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=800", caption: "هرم الغذاء" },
            { type: "text", content: "التغذية السليمة أساسية للنمو..." }
        ],
        quiz: [
            { id: 1, question: "ما العنصر المسؤول عن بناء العضلات؟", options: ["كربوهيدرات", "بروتينات", "دهون", "سكريات"], correctAnswer: 1, explanation: "البروتينات تبني العضلات" }
        ]
    },
    {
        id: 3,
        title: "أهمية ممارسة الرياضة",
        description: "اكتشف فوائد الرياضة لصحتك الجسدية والنفسية",
        thumbnail: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
        views: 28000,
        quizCount: 1,
        mediaCount: 2,
        status: "draft",
        createdAt: "2024-01-08",
        challengesTaken: 0,
        avgScore: 0,
        targetAudience: "all",
        duration: "5 دقائق"
    }
];

const initialActiveChallenges = [
    {
        id: 1,
        contentId: 1,
        pin: "847291",
        contentTitle: "كيف نحمي أنفسنا من الجراثيم",
        mode: "group",
        players: 24,
        status: "playing",
        startedAt: "قبل 5 دقائق",
        type: "admin"
    },
    {
        id: 2,
        contentId: 2,
        pin: "319847",
        contentTitle: "التغذية الصحية للأطفال",
        mode: "group",
        players: 12,
        status: "waiting",
        startedAt: "قبل دقيقة",
        type: "admin"
    },
    {
        id: 3,
        contentId: 1,
        pin: "112233",
        contentTitle: "كيف نحمي أنفسنا من الجراثيم",
        mode: "group",
        players: 8,
        status: "playing",
        startedAt: "قبل 3 دقائق",
        type: "user",
        creatorName: "أحمد منصور"
    },
    {
        id: 4,
        contentId: 3,
        pin: "998877",
        contentTitle: "أهمية ممارسة الرياضة",
        mode: "group",
        players: 5,
        status: "waiting",
        startedAt: "قبل لحظات",
        type: "user",
        creatorName: "فصل 4/أ"
    }
];

const mockRecentParticipants = [
    { name: "سارة أحمد", score: 95, avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=sara" },
    { name: "محمد علي", score: 88, avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=mohammad" },
    { name: "فاطمة خالد", score: 76, avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=fatima" },
    { name: "عمر حسن", score: 92, avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=omar" }
];

const ChannelDashboard = () => {
    const [activeTab, setActiveTab] = useState("overview");
    const [challengeFilter, setChallengeFilter] = useState<"all" | "admin" | "user">("all");
    const [showNewContentForm, setShowNewContentForm] = useState(false);
    const [showNewChallengeForm, setShowNewChallengeForm] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    // Challenge Creation State
    const [selectedContentId, setSelectedContentId] = useState<string>("");

    // CRUD State
    const [contents, setContents] = useState<DashboardContent[]>(initialMockContents);
    const [activeChallenges, setActiveChallenges] = useState(initialActiveChallenges);
    const [pastChallenges, setPastChallenges] = useState<any[]>([]);
    const [editingContent, setEditingContent] = useState<DashboardContent | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    // CRUD Handlers
    const handleCreateContent = () => {
        setEditingContent(null);
        setIsEditorOpen(true);
    };

    const handleEditContent = (content: DashboardContent) => {
        setEditingContent(content);
        setIsEditorOpen(true);
    };

    const handleSaveContent = (contentData: any) => {
        // Calculate items count from the new structure or fallback to legacy quiz
        const itemsCount = contentData.challengeItems?.length || contentData.quiz?.length || 0;

        if (editingContent) {
            // Update existing
            setContents(prev => prev.map(c =>
                c.id === editingContent.id
                    ? {
                        ...c,
                        ...contentData,
                        quizCount: itemsCount, // Update count based on new items
                        mediaCount: contentData.media?.length || c.mediaCount
                    }
                    : c
            ));
        } else {
            // Create new
            const newContent: DashboardContent = {
                id: Date.now(),
                title: contentData.title || "محتوى جديد",
                description: contentData.description || "",
                thumbnail: contentData.thumbnail || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop",
                views: 0,
                quizCount: itemsCount,
                mediaCount: contentData.media?.length || 0,
                status: "draft",
                createdAt: new Date().toISOString().split('T')[0],
                challengesTaken: 0,
                avgScore: 0,
                targetAudience: contentData.targetAudience || "all",
                duration: contentData.duration || "",
                media: contentData.media || [],
                quiz: contentData.quiz || [],
                challengeItems: contentData.challengeItems || []
            };
            setContents(prev => [newContent, ...prev]);
        }
        setIsEditorOpen(false);
        setEditingContent(null);
    };

    const handleDeleteContent = (id: number) => {
        setContents(prev => prev.filter(c => c.id !== id));
        setDeleteConfirmId(null);
    };

    const handleTogglePublish = (id: number) => {
        setContents(prev => prev.map(c =>
            c.id === id
                ? { ...c, status: c.status === "published" ? "draft" : "published" }
                : c
        ));
    };

    const handleCreateChallenge = () => {
        if (!selectedContentId) return;

        const content = contents.find(c => c.id.toString() === selectedContentId);
        if (!content) return;

        const pin = generatePin();
        const newChallenge = {
            id: Date.now(),
            contentId: content.id,
            pin: pin,
            contentTitle: content.title,
            type: "group",
            players: 0,
            status: "waiting",
            startedAt: "الآن",
            type: "admin"
        };

        setActiveChallenges(prev => [newChallenge, ...prev]);
        setShowNewChallengeForm(false);
        setSelectedContentId("");

        toast({
            title: "تم إنشاء التحدي بنجاح",
            description: `سيتم توجيهك الآن إلى وضع إدارة التحدي للمحتوى: ${content.title}`,
            variant: "default",
        });

        // Redirect to the group challenge as a host
        // Using 'activities' as default category
        setTimeout(() => {
            navigate(`/channel/${mockChannelData.id}/content/${content.id}/challenge/group/activities/${pin}?host=true`);
        }, 1000);
    };

    const handleEndChallenge = (id: number) => {
        const challengeToEnd = activeChallenges.find(c => c.id === id);
        if (challengeToEnd) {
            // Mock result data
            const mockWinners = ["أحمد محمد", "سارة علي", "خالد يوسف", "نورة العلي"];
            const randomWinner = mockWinners[Math.floor(Math.random() * mockWinners.length)];
            const randomScore = Math.floor(Math.random() * 500) + 500;
            const duration = Math.floor(Math.random() * 20) + 10;

            setPastChallenges(prev => [{
                ...challengeToEnd,
                status: "finished",
                endedAt: new Date().toLocaleDateString('ar-EG'),
                winner: randomWinner,
                topScore: randomScore,
                duration: `${duration} دقيقة`
            }, ...prev]);

            setActiveChallenges(prev => prev.filter(c => c.id !== id));
            toast({
                title: "تم إنهاء التحدي",
                description: "تم نقل التحدي إلى السجل وحفظ النتائج",
            });
        }
    };

    // Use contents for mockContents references
    const mockContents = contents;

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-secondary/5" dir="rtl">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        <div className="flex items-center gap-4">
                            <Link to="/" className="flex items-center gap-3">
                                <img src="/logo.png" alt="Lab4" className="w-10 h-10 rounded-xl object-contain bg-background" />
                                <span className="text-xl font-bold hidden md:block">Lab4</span>
                            </Link>
                            <div className="h-8 w-px bg-border" />
                            <div className="flex items-center gap-2">
                                <img src={mockChannelData.logo} alt={mockChannelData.name} className="w-8 h-8 rounded-lg object-cover" />
                                <span className="font-medium hidden md:block">{mockChannelData.name}</span>
                                {mockChannelData.verified && <CheckCircle className="w-4 h-4 text-primary fill-primary/20" />}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" className="relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">5</span>
                            </Button>
                            <Button variant="outline" size="sm" asChild className="gap-2">
                                <Link to={`/channel/${mockChannelData.id}`}>
                                    <Eye className="w-4 h-4" />
                                    <span className="hidden md:inline">عرض القناة</span>
                                </Link>
                            </Button>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                                    م
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Sidebar */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1"
                    >
                        <Card className="sticky top-24">
                            <CardContent className="p-4">
                                {/* Channel Quick Stats */}
                                <div className="text-center mb-4 pb-4 border-b">
                                    <img
                                        src={mockChannelData.logo}
                                        alt={mockChannelData.name}
                                        className="w-16 h-16 rounded-xl mx-auto mb-3 border-4 border-primary/20"
                                    />
                                    <h2 className="font-bold text-sm mb-1">{mockChannelData.name}</h2>
                                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <Users className="w-3 h-3" />
                                        <span>{mockChannelData.followers.toLocaleString()}</span>
                                        <Star className="w-3 h-3 text-warning fill-warning mr-2" />
                                        <span>{mockChannelData.rating}</span>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <nav className="space-y-1">
                                    {[
                                        { id: "overview", icon: LayoutDashboard, label: "نظرة عامة" },
                                        { id: "content", icon: Library, label: "المحتويات" },
                                        { id: "challenges", icon: Gamepad2, label: "التحديات" },
                                        { id: "analytics", icon: ChartBar, label: "الإحصائيات" },
                                        { id: "settings", icon: Cog, label: "إعدادات القناة" }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === item.id
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-muted"
                                                }`}
                                        >
                                            <item.icon className="w-4 h-4" />
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </nav>

                                <div className="mt-4 pt-4 border-t">
                                    <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2">
                                        <LogOut className="w-4 h-4" />
                                        تسجيل الخروج
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Main Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-4 space-y-6"
                    >
                        <AnimatePresence mode="wait">
                            {/* Overview Tab */}
                            {activeTab === "overview" && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    {/* Welcome Banner */}
                                    <Card className="overflow-hidden">
                                        <div className="relative p-6 bg-gradient-to-r from-secondary via-secondary/90 to-primary">
                                            <div className="relative z-10">
                                                <h1 className="text-2xl font-bold text-white mb-2">
                                                    مرحباً بك في لوحة تحكم قناتك 🎯
                                                </h1>
                                                <p className="text-white/80">
                                                    إدارة المحتوى والتحديات وتحليل الأداء
                                                </p>
                                            </div>
                                            <div className="absolute left-0 top-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                                        </div>
                                    </Card>

                                    {/* Quick Stats */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                                    <Eye className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{(mockChannelData.totalViews / 1000).toFixed(0)}K</p>
                                                    <p className="text-sm text-muted-foreground">مشاهدة</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                                    <Gamepad2 className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{mockChannelData.totalChallenges.toLocaleString()}</p>
                                                    <p className="text-sm text-muted-foreground">تحدي</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                                    <Users className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{mockChannelData.activeUsers.toLocaleString()}</p>
                                                    <p className="text-sm text-muted-foreground">مستخدم نشط</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                                    <Library className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{mockContents.length}</p>
                                                    <p className="text-sm text-muted-foreground">محتوى</p>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Active Challenges & Quick Actions */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Active Challenges */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Zap className="w-5 h-5 text-warning" />
                                                    تحديات نشطة (المسؤول + المجتمع)
                                                </CardTitle>
                                                <span className="px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold">
                                                    {activeChallenges.length} قيد التشغيل
                                                </span>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {activeChallenges.slice(0, 4).map(challenge => (
                                                    <div
                                                        key={challenge.id}
                                                        className={`p-3 rounded-xl border transition-all ${challenge.type === 'admin' ? 'bg-primary/5 border-primary/20' : 'bg-muted/50 border-muted-foreground/10'}`}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${challenge.status === "playing" ? "bg-success animate-pulse" : "bg-warning"}`} />
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${challenge.type === 'admin' ? 'bg-primary text-white' : 'bg-secondary text-white'}`}>
                                                                    {challenge.type === 'admin' ? 'رسمي' : 'مجتمع'}
                                                                </span>
                                                                <span className="text-xs font-medium truncate max-w-[120px]">
                                                                    {challenge.contentTitle}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                                                                <Users className="w-3 h-3" />
                                                                {challenge.players}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[10px] font-bold text-muted-foreground">PIN:</span>
                                                                <span className="font-mono font-black text-sm text-primary">{challenge.pin}</span>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                {challenge.type === 'admin' ? (
                                                                    <Button size="sm" className="h-7 text-[10px] px-2 gap-1" asChild>
                                                                        <Link to={`/channel/${mockChannelData.id}/content/${challenge.contentId}/challenge/group/activities/${challenge.pin}?host=true`}>
                                                                            <Settings2 className="w-3 h-3" />
                                                                            تحكم
                                                                        </Link>
                                                                    </Button>
                                                                ) : (
                                                                    <Button size="sm" variant="secondary" className="h-7 text-[10px] px-2 gap-1" asChild>
                                                                        <Link to={`/channel/${mockChannelData.id}/content/${challenge.contentId}/challenge/group/activities/${challenge.pin}?spectate=true`}>
                                                                            <Eye className="w-3 h-3" />
                                                                            مراقبة
                                                                        </Link>
                                                                    </Button>
                                                                )}
                                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => {
                                                                    navigator.clipboard.writeText(challenge.pin);
                                                                    toast({ title: "تم نسخ الرمز", description: challenge.pin });
                                                                }}>
                                                                    <Copy className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {activeChallenges.length > 4 && (
                                                    <Button variant="ghost" className="w-full text-xs" onClick={() => setActiveTab("challenges")}>
                                                        عرض جميع التحديات ({activeChallenges.length})
                                                    </Button>
                                                )}
                                                {activeChallenges.length === 0 && (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                                        <p className="text-sm">لا توجد تحديات نشطة</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Quick Actions */}
                                        <Card>
                                            <CardHeader className="py-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Sparkles className="w-5 h-5 text-primary" />
                                                    إجراءات سريعة
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="h-auto py-4 flex-col gap-2"
                                                    onClick={() => setActiveTab("content")}
                                                >
                                                    <Plus className="w-6 h-6 text-primary" />
                                                    <span>إضافة محتوى</span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto py-4 flex-col gap-2"
                                                    onClick={() => setShowNewChallengeForm(true)}
                                                >
                                                    <Gamepad2 className="w-6 h-6 text-secondary" />
                                                    <span>بدء تحدي</span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto py-4 flex-col gap-2"
                                                    onClick={() => setActiveTab("analytics")}
                                                >
                                                    <ChartBar className="w-6 h-6 text-amber-500" />
                                                    <span>عرض التقارير</span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto py-4 flex-col gap-2"
                                                    asChild
                                                >
                                                    <Link to={`/channel/${mockChannelData.id}`}>
                                                        <ExternalLink className="w-6 h-6 text-purple-500" />
                                                        <span>زيارة القناة</span>
                                                    </Link>
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Top Content & Recent Participants */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Top Content */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <TrendingUp className="w-5 h-5 text-success" />
                                                    أفضل المحتويات
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {mockContents.filter(c => c.status === "published").slice(0, 3).map((content, i) => (
                                                    <div
                                                        key={content.id}
                                                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                                                    >
                                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : "bg-amber-700"
                                                            }`}>
                                                            {i + 1}
                                                        </span>
                                                        <img
                                                            src={content.thumbnail}
                                                            alt={content.title}
                                                            className="w-12 h-12 rounded-lg object-cover"
                                                        />
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm line-clamp-1">{content.title}</p>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Eye className="w-3 h-3" />
                                                                {content.views.toLocaleString()}
                                                                <Gamepad2 className="w-3 h-3 mr-1" />
                                                                {content.challengesTaken}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>

                                        {/* Recent Participants */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Users className="w-5 h-5 text-primary" />
                                                    آخر المشاركين
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {mockRecentParticipants.map((participant, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                                                    >
                                                        <img
                                                            src={participant.avatar}
                                                            alt={participant.name}
                                                            className="w-10 h-10 rounded-full"
                                                        />
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm">{participant.name}</p>
                                                            <p className="text-xs text-muted-foreground">منذ قليل</p>
                                                        </div>
                                                        <span className={`font-bold ${participant.score >= 80 ? "text-success" :
                                                            participant.score >= 60 ? "text-warning" : "text-destructive"
                                                            }`}>
                                                            {participant.score}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </motion.div>
                            )}

                            {/* Content Tab */}
                            {activeTab === "content" && (
                                <motion.div
                                    key="content"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    {/* Editor View */}
                                    {isEditorOpen ? (
                                        <ContentEditor
                                            content={editingContent ? {
                                                id: editingContent.id,
                                                title: editingContent.title,
                                                description: editingContent.description,
                                                thumbnail: editingContent.thumbnail,
                                                targetAudience: editingContent.targetAudience || "all",
                                                duration: editingContent.duration,
                                                media: editingContent.media || [],
                                                quiz: editingContent.quiz || [],
                                                challengeItems: editingContent.challengeItems || [],
                                                views: editingContent.views,
                                                createdAt: editingContent.createdAt
                                            } : undefined}
                                            onSave={handleSaveContent}
                                            onCancel={() => {
                                                setIsEditorOpen(false);
                                                setEditingContent(null);
                                            }}
                                        />
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                                    <Library className="w-6 h-6 text-primary" />
                                                    المحتويات التعليمية
                                                    <span className="text-sm font-normal text-muted-foreground">
                                                        ({mockContents.length} محتوى)
                                                    </span>
                                                </h2>
                                                <Button className="gap-2" onClick={handleCreateContent}>
                                                    <Plus className="w-4 h-4" />
                                                    إضافة محتوى جديد
                                                </Button>
                                            </div>

                                            {/* Delete Confirmation Dialog */}
                                            <AnimatePresence>
                                                {deleteConfirmId !== null && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                    >
                                                        <Card className="border-destructive/50 bg-destructive/5">
                                                            <CardContent className="p-4">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                                                        <AlertTriangle className="w-6 h-6 text-destructive" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <h3 className="font-bold text-destructive">تأكيد الحذف</h3>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            هل أنت متأكد من حذف هذا المحتوى؟ لا يمكن التراجع عن هذا الإجراء.
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                                                                            إلغاء
                                                                        </Button>
                                                                        <Button variant="destructive" size="sm" onClick={() => handleDeleteContent(deleteConfirmId)}>
                                                                            <Trash2 className="w-4 h-4 ml-1" />
                                                                            حذف
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Content List */}
                                            <div className="space-y-4">
                                                {mockContents.map((content, i) => (
                                                    <motion.div
                                                        key={content.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        layout
                                                    >
                                                        <Card className={`overflow-hidden hover:shadow-lg transition-all ${deleteConfirmId === content.id ? "ring-2 ring-destructive" : ""}`}>
                                                            <CardContent className="p-0">
                                                                <div className="flex flex-col md:flex-row">
                                                                    {/* Thumbnail */}
                                                                    <div className="relative md:w-48 h-36 md:h-auto overflow-hidden flex-shrink-0">
                                                                        <img
                                                                            src={content.thumbnail}
                                                                            alt={content.title}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                        <button
                                                                            onClick={() => handleTogglePublish(content.id)}
                                                                            className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${content.status === "published" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}`}
                                                                        >
                                                                            {content.status === "published" ? "✓ منشور" : "مسودة"}
                                                                        </button>
                                                                    </div>

                                                                    <div className="flex-1 p-5">
                                                                        <div className="flex items-start justify-between mb-2">
                                                                            <h3 className="text-lg font-bold">{content.title}</h3>
                                                                            <span className="text-xs px-2 py-1 rounded bg-muted">
                                                                                {content.targetAudience === "children" ? "للأطفال 👶" : content.targetAudience === "adults" ? "للكبار" : "للجميع 👨‍👩‍👧‍👦"}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm text-muted-foreground mb-4">{content.description}</p>

                                                                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                                                                            <span className="flex items-center gap-1">
                                                                                <Eye className="w-4 h-4" />
                                                                                {content.views.toLocaleString()} مشاهدة
                                                                            </span>
                                                                            <span className="flex items-center gap-1">
                                                                                <Video className="w-4 h-4" />
                                                                                {content.mediaCount} وسائط
                                                                            </span>
                                                                            <span className="flex items-center gap-1">
                                                                                <ListChecks className="w-4 h-4" />
                                                                                {content.quizCount} أسئلة
                                                                            </span>
                                                                            <span className="flex items-center gap-1">
                                                                                <Gamepad2 className="w-4 h-4" />
                                                                                {content.challengesTaken} تحدي
                                                                            </span>
                                                                            {content.avgScore > 0 && (
                                                                                <span className="flex items-center gap-1">
                                                                                    <Target className="w-4 h-4" />
                                                                                    متوسط: {content.avgScore}%
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex items-center justify-between pt-4 border-t">
                                                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                                <span className="flex items-center gap-1">
                                                                                    <Calendar className="w-3 h-3" />
                                                                                    {content.createdAt}
                                                                                </span>
                                                                                {content.duration && (
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Clock className="w-3 h-3" />
                                                                                        {content.duration}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="gap-1"
                                                                                    onClick={() => handleEditContent(content)}
                                                                                >
                                                                                    <Edit className="w-4 h-4" />
                                                                                    تعديل
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="gap-1 text-destructive hover:text-destructive"
                                                                                    onClick={() => setDeleteConfirmId(content.id)}
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                    حذف
                                                                                </Button>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className={`gap-1 ${content.status === 'draft' ? 'border-amber-500/50 text-amber-600 hover:bg-amber-50' : 'border-primary/50 text-primary hover:bg-primary/5'}`}
                                                                                    onClick={() => {
                                                                                        setSelectedContentId(content.id.toString());
                                                                                        setShowNewChallengeForm(true);
                                                                                    }}
                                                                                >
                                                                                    <Zap className={`w-4 h-4 ${content.status === 'draft' ? 'text-amber-500' : 'text-primary'}`} />
                                                                                    بدء تحدي
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </motion.div>
                                                ))}

                                                {mockContents.length === 0 && (
                                                    <Card className="p-12 text-center">
                                                        <Library className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                                                        <h3 className="text-xl font-bold mb-2">لا توجد محتويات</h3>
                                                        <p className="text-muted-foreground mb-4">ابدأ بإضافة محتوى تعليمي جديد</p>
                                                        <Button onClick={handleCreateContent} className="gap-2">
                                                            <Plus className="w-4 h-4" />
                                                            إضافة محتوى جديد
                                                        </Button>
                                                    </Card>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* Challenges Tab */}
                            {activeTab === "challenges" && (
                                <motion.div
                                    key="challenges"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <Gamepad2 className="w-6 h-6 text-primary" />
                                            إدارة التحديات
                                        </h2>
                                        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                                            <Button
                                                variant={challengeFilter === "all" ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setChallengeFilter("all")}
                                            >الكل</Button>
                                            <Button
                                                variant={challengeFilter === "admin" ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setChallengeFilter("admin")}
                                            >تحدياتي</Button>
                                            <Button
                                                variant={challengeFilter === "user" ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setChallengeFilter("user")}
                                            >تحديات المجتمع</Button>
                                        </div>
                                        <Button className="gap-2" onClick={() => setShowNewChallengeForm(true)}>
                                            <Plus className="w-4 h-4" />
                                            إنشاء تحدي جديد
                                        </Button>
                                    </div>

                                    {/* Active Challenges Section */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Zap className="w-5 h-5 text-warning" />
                                                التحديات النشطة الآن
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {activeChallenges.filter(c => challengeFilter === "all" || c.type === challengeFilter).map(challenge => (
                                                    <Card key={challenge.id} className={`transition-all border-l-4 ${challenge.type === 'admin' ? 'border-l-primary bg-primary/5' : 'border-l-secondary bg-secondary/5'}`}>
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${challenge.type === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                                                                        }`}>
                                                                        {challenge.type === 'admin' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                                                        {challenge.type === 'admin' ? 'تحدي رسمي' : `بواسطة: ${challenge.creatorName || 'مستخدم'}`}
                                                                    </span>
                                                                    <span className={`flex items-center gap-2 text-[10px] font-bold ${challenge.status === "playing" ? "text-success" : "text-warning"}`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${challenge.status === "playing" ? "bg-success animate-pulse" : "bg-warning"}`} />
                                                                        {challenge.status === "playing" ? "قيد اللعب" : "في الانتظار"}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground">{challenge.startedAt}</span>
                                                            </div>
                                                            <h3 className="font-bold mb-1 text-sm line-clamp-1">{challenge.contentTitle}</h3>
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                                                    <Users className="w-3 h-3" />
                                                                    {challenge.players} لاعب
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] text-muted-foreground">PIN:</span>
                                                                    <span className="font-mono font-black text-primary">{challenge.pin}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {challenge.type === 'admin' ? (
                                                                    <>
                                                                        <Button className="flex-1 h-8 text-xs" size="sm" asChild>
                                                                            <Link to={`/channel/${mockChannelData.id}/content/${challenge.contentId || 1}/challenge/group/activities/${challenge.pin}?host=true`}>
                                                                                <Settings2 className="w-3 h-3 ml-1" />
                                                                                إدارة التحدي
                                                                            </Link>
                                                                        </Button>
                                                                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
                                                                            navigator.clipboard.writeText(challenge.pin);
                                                                            toast({ title: "تم نسخ الرمز", description: challenge.pin });
                                                                        }}>نسخ</Button>
                                                                        <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleEndChallenge(challenge.id)}>حذف</Button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Button variant="secondary" className="flex-1 h-8 text-xs font-bold" size="sm" asChild>
                                                                            <Link to={`/channel/${mockChannelData.id}/content/${challenge.contentId || 1}/challenge/group/activities/${challenge.pin}?spectate=true`}>
                                                                                <Eye className="w-3 h-3 ml-1" />
                                                                                مراقبة الأداء
                                                                            </Link>
                                                                        </Button>
                                                                        <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                                                                            <Link to={`/channel/${mockChannelData.id}/analytics/${challenge.id}`}>
                                                                                <ChartBar className="w-3 h-3 ml-1" />
                                                                                تحليل
                                                                            </Link>
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Past Challenges */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <History className="w-5 h-5 text-muted-foreground" />
                                                سجل التحديات
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {pastChallenges.length > 0 ? (
                                                <div className="space-y-3">
                                                    {pastChallenges.map(challenge => (
                                                        <div key={challenge.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                                            <div>
                                                                <h4 className="font-bold text-sm mb-2">{challenge.contentTitle}</h4>
                                                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                                    <span className="flex items-center gap-1 bg-background px-2 py-1 rounded-md border">
                                                                        <Calendar className="w-3 h-3" />
                                                                        {challenge.endedAt || "اليوم"}
                                                                    </span>
                                                                    <span className="flex items-center gap-1 bg-background px-2 py-1 rounded-md border">
                                                                        <Users className="w-3 h-3" />
                                                                        {challenge.players || 0} لاعب
                                                                    </span>
                                                                    <span className="flex items-center gap-1 bg-background px-2 py-1 rounded-md border">
                                                                        <Clock className="w-3 h-3" />
                                                                        {challenge.duration || "15 دقيقة"}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-2">
                                                                    <span className="flex items-center gap-1 text-amber-600 font-bold text-xs bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                                                                        <Trophy className="w-3 h-3" />
                                                                        الفائز: {challenge.winner || "غير محدد"}
                                                                    </span>
                                                                    <span className="flex items-center gap-1 text-primary font-bold text-xs bg-primary/10 px-2 py-1 rounded-full">
                                                                        <Star className="w-3 h-3" />
                                                                        {challenge.topScore || 0} نقطة
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Button variant="ghost" size="sm" asChild>
                                                                    <Link to={`/channel/${mockChannelData.id}/analytics/${challenge.id}`}>
                                                                        <ChartBar className="w-4 h-4 text-primary" />
                                                                    </Link>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                                    <p>سجل التحديات السابقة سيظهر هنا</p>
                                                    <p className="text-sm">يمكنك مراجعة نتائج التحديات وتحليلها</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Analytics Tab */}
                            {activeTab === "analytics" && (
                                <motion.div
                                    key="analytics"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        <ChartBar className="w-6 h-6 text-primary" />
                                        الإحصائيات والتقارير
                                    </h2>

                                    {/* Overview Stats */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Card className="p-5 text-center bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
                                            <Eye className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                                            <p className="text-3xl font-black">{(mockChannelData.totalViews / 1000).toFixed(0)}K</p>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">إجمالي المشاهدات</p>
                                            <p className="text-[10px] text-success font-bold mt-2 flex items-center justify-center gap-1">
                                                <TrendingUp className="w-3 h-3" /> +12%
                                            </p>
                                        </Card>
                                        <Card className="p-5 text-center bg-gradient-to-br from-secondary/5 to-transparent border-secondary/20">
                                            <Gamepad2 className="w-8 h-8 mx-auto mb-2 text-secondary" />
                                            <p className="text-3xl font-black">{mockChannelData.totalChallenges}</p>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">إجمالي التحديات</p>
                                            <p className="text-[10px] text-success font-bold mt-2 flex items-center justify-center gap-1">
                                                <TrendingUp className="w-3 h-3" /> +25%
                                            </p>
                                        </Card>
                                        <Card className="p-5 text-center bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20">
                                            <Users className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                                            <p className="text-3xl font-black">{mockChannelData.activeUsers}</p>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">مستخدم نشط</p>
                                            <p className="text-[10px] text-success font-bold mt-2 flex items-center justify-center gap-1">
                                                <TrendingUp className="w-3 h-3" /> +8%
                                            </p>
                                        </Card>
                                        <Card className="p-5 text-center bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/20">
                                            <Target className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                                            <p className="text-3xl font-black">78%</p>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">متوسط النتائج</p>
                                            <p className="text-[10px] text-success font-bold mt-2 flex items-center justify-center gap-1">
                                                <TrendingUp className="w-3 h-3" /> +3%
                                            </p>
                                        </Card>
                                    </div>

                                    {/* Charts & Details */}
                                    <div className="space-y-6">
                                        {/* Main Analytics Grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                            {/* Left Column: Engagement & Performance (8 cols) */}
                                            <div className="lg:col-span-8 space-y-6">
                                                {/* Results Distribution */}
                                                <Card>
                                                    <CardHeader className="flex flex-row items-center justify-between">
                                                        <CardTitle className="text-lg font-bold">توزيع الدرجات الشامل</CardTitle>
                                                        <div className="flex gap-2">
                                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                                                جماعي
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                <div className="w-2 h-2 rounded-full bg-secondary" />
                                                                فردي
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="flex items-end justify-between h-[150px] gap-2 px-2">
                                                            {[...Array(10)].map((_, i) => (
                                                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                                                                    <div className="w-full flex flex-col-reverse gap-0.5 h-full justify-end">
                                                                        <motion.div
                                                                            initial={{ height: 0 }}
                                                                            animate={{ height: `${20 + Math.random() * 40}%` }}
                                                                            className="w-full bg-primary/20 rounded-sm group-hover:bg-primary/40 transition-all"
                                                                        />
                                                                        <motion.div
                                                                            initial={{ height: 0 }}
                                                                            animate={{ height: `${10 + Math.random() * 30}%` }}
                                                                            className="w-full bg-secondary/20 rounded-sm group-hover:bg-secondary/40 transition-all border-t border-white/10"
                                                                        />
                                                                    </div>
                                                                    <span className="text-[10px] text-muted-foreground">{i * 10}%</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-6">
                                                            <div>
                                                                <p className="text-xs text-muted-foreground mb-1">متوسط الدقة (جماعي)</p>
                                                                <div className="flex items-end gap-2">
                                                                    <span className="text-2xl font-black text-primary">82%</span>
                                                                    <span className="text-[10px] text-success font-bold mb-1">+5%</span>
                                                                </div>
                                                            </div>
                                                            <div className="border-x px-4 text-center">
                                                                <p className="text-xs text-muted-foreground mb-1">متوسط الدقة (فردي)</p>
                                                                <div className="flex items-end justify-center gap-2">
                                                                    <span className="text-2xl font-black text-secondary">71%</span>
                                                                    <span className="text-[10px] text-success font-bold mb-1">+2%</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-muted-foreground mb-1">معدل الإكمال الكلي</p>
                                                                <div className="flex items-end justify-end gap-2">
                                                                    <span className="text-2xl font-black text-emerald-500">91%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Top Content Table */}
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="text-lg font-bold">أفضل المحتويات تفاعلاً</CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="space-y-2">
                                                            {[
                                                                { title: "كيف نحمي أنفسنا من الجراثيم", views: "125K", mode: "جماعي", completion: "94%", score: 85 },
                                                                { title: "التغذية الصحية للأطفال", views: "89K", mode: "فردي", completion: "88%", score: 72 },
                                                                { title: "أهمية ممارسة الرياضة", views: "64K", mode: "جماعي", completion: "82%", score: 78 },
                                                                { title: "الوعي البيئي والتدوير", views: "45K", mode: "جماعي", completion: "91%", score: 89 },
                                                                { title: "مدخل إلى البرمجة المبسطة", views: "32K", mode: "فردي", completion: "76%", score: 65 }
                                                            ].map((item, i) => (
                                                                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-border group">
                                                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                                                                        {i + 1}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-bold text-sm truncate">{item.title}</p>
                                                                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                                                                            <span className={`px-1.5 py-0.5 rounded-full ${item.mode === 'جماعي' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                                                                                {item.mode}
                                                                            </span>
                                                                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.views}</span>
                                                                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {item.completion}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <div className="text-sm font-black">{item.score}%</div>
                                                                        <Progress value={item.score} className="w-16 h-1" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            {/* Right Column: Audience & Mode (4 cols) */}
                                            <div className="lg:col-span-4 space-y-6">
                                                {/* Mode Distribution */}
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                            <Brain className="w-4 h-4 text-purple-500" />
                                                            توزيع أنماط اللعب
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="space-y-6">
                                                            <div className="relative h-40 flex items-center justify-center">
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="text-center">
                                                                        <p className="text-2xl font-black">62/38</p>
                                                                        <p className="text-[10px] text-muted-foreground">جماعي / فردي</p>
                                                                    </div>
                                                                </div>
                                                                <svg className="w-32 h-32 transform -rotate-90">
                                                                    <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-secondary/20" />
                                                                    <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={314} strokeDashoffset={314 * 0.38} className="text-primary" />
                                                                </svg>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-3 h-3 rounded-full bg-primary" />
                                                                        <span>تحديات جماعية (Live)</span>
                                                                    </div>
                                                                    <span className="font-bold">62%</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-3 h-3 rounded-full bg-secondary" />
                                                                        <span>تحديات فردية</span>
                                                                    </div>
                                                                    <span className="font-bold">38%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Audience Insights */}
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                            <Activity className="w-4 h-4 text-blue-500" />
                                                            رؤى الجمهور
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-6">
                                                        <div>
                                                            <p className="text-xs font-bold mb-3 text-muted-foreground uppercase">الفئات العمرية</p>
                                                            <div className="space-y-3">
                                                                {[
                                                                    { label: "6-12 سنة", val: 45, color: "bg-blue-400" },
                                                                    { label: "13-18 سنة", val: 32, color: "bg-indigo-400" },
                                                                    { label: "19+ سنة", val: 23, color: "bg-slate-400" }
                                                                ].map((age, i) => (
                                                                    <div key={i} className="space-y-1">
                                                                        <div className="flex justify-between text-[10px]">
                                                                            <span>{age.label}</span>
                                                                            <span className="font-bold">{age.val}%</span>
                                                                        </div>
                                                                        <Progress value={age.val} className={`h-1`} style={{ '--progress-background': age.color } as any} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="pt-4 border-t">
                                                            <p className="text-xs font-bold mb-3 text-muted-foreground uppercase">الجنس</p>
                                                            <div className="flex gap-4">
                                                                <div className="flex-1 p-3 rounded-xl bg-blue-500/5 text-center">
                                                                    <p className="text-[10px] text-blue-600 font-bold mb-1">ذكور</p>
                                                                    <p className="text-xl font-black">48%</p>
                                                                </div>
                                                                <div className="flex-1 p-3 rounded-xl bg-pink-500/5 text-center">
                                                                    <p className="text-[10px] text-pink-600 font-bold mb-1">إناث</p>
                                                                    <p className="text-xl font-black">52%</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Regional Performance */}
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                            <MapPin className="w-4 h-4 text-red-500" />
                                                            أداء الجمهور جغرافياً
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="space-y-5">
                                                            {[
                                                                { region: "الرياض", users: "45K", score: 82, color: "bg-blue-500" },
                                                                { region: "جدة", users: "38K", score: 79, color: "bg-emerald-500" },
                                                                { region: "الشرقية", users: "28K", score: 85, color: "bg-amber-500" },
                                                                { region: "مكة", users: "22K", score: 74, color: "bg-red-500" }
                                                            ].map((data, i) => (
                                                                <div key={i} className="space-y-1.5">
                                                                    <div className="flex items-center justify-between text-[11px]">
                                                                        <span className="font-bold">{data.region}</span>
                                                                        <span className="text-muted-foreground">{data.score}% دقة</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Progress value={data.score} className={`h-1.5 flex-1`} style={{ '--progress-background': data.color } as any} />
                                                                        <span className="text-[9px] font-bold text-muted-foreground w-6">{data.users}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Export Options */}
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-bold mb-1">تصدير التقارير</h3>
                                                    <p className="text-sm text-muted-foreground">قم بتحميل تقارير مفصلة بتنسيق CSV أو PDF</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" className="gap-2">
                                                        <Download className="w-4 h-4" />
                                                        CSV
                                                    </Button>
                                                    <Button variant="outline" className="gap-2">
                                                        <Download className="w-4 h-4" />
                                                        PDF
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Settings Tab */}
                            {activeTab === "settings" && (
                                <motion.div
                                    key="settings"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        <Cog className="w-6 h-6 text-primary" />
                                        إعدادات القناة
                                    </h2>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>معلومات القناة الأساسية</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-center gap-6 mb-6">
                                                <div className="relative">
                                                    <img
                                                        src={mockChannelData.logo}
                                                        alt="Channel Logo"
                                                        className="w-24 h-24 rounded-xl object-cover"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="secondary"
                                                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <div>
                                                    <p className="font-medium mb-1">شعار القناة</p>
                                                    <p className="text-sm text-muted-foreground">PNG أو JPG. الحجم الأقصى 2MB</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">اسم القناة</label>
                                                    <Input defaultValue={mockChannelData.name} />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">الفئة</label>
                                                    <Input defaultValue={mockChannelData.category} />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium mb-2 block">الوصف</label>
                                                <Textarea
                                                    defaultValue="القناة الرسمية لوزارة الصحة - توعية صحية شاملة لجميع أفراد المجتمع"
                                                    rows={4}
                                                />
                                            </div>

                                            <Button>حفظ التغييرات</Button>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>إعدادات التحديات الافتراضية</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {[
                                                { label: "السماح بالانضمام المتأخر", enabled: true },
                                                { label: "عرض لوحة المتصدرين", enabled: true },
                                                { label: "تشغيل الموسيقى", enabled: false },
                                                { label: "إظهار الإجابات الصحيحة", enabled: true }
                                            ].map((setting, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                                    <span>{setting.label}</span>
                                                    <Button variant={setting.enabled ? "default" : "outline"} size="sm">
                                                        {setting.enabled ? "مفعل" : "معطل"}
                                                    </Button>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>

            <NewChallengeDialog
                open={showNewChallengeForm}
                onOpenChange={setShowNewChallengeForm}
                contents={contents}
                selectedContentId={selectedContentId}
                onContentSelect={setSelectedContentId}
                onSubmit={handleCreateChallenge}
            />
        </div>
    );
};

export default ChannelDashboard;

// Add this Dialog component at the end
function NewChallengeDialog({
    open,
    onOpenChange,
    contents,
    selectedContentId,
    onContentSelect,
    onSubmit
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contents: DashboardContent[];
    selectedContentId: string;
    onContentSelect: (id: string) => void;
    onSubmit: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader className="text-center">
                    <DialogTitle className="text-center text-xl">بدء تحدي جديد</DialogTitle>
                    <DialogDescription className="text-center">
                        اختر المحتوى الذي تريد إنشاء تحدي له وسنقوم بتوليد رمز PIN للمشاركة.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="content">المحتوى</Label>
                        <Select value={selectedContentId} onValueChange={onContentSelect}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر المحتوى..." />
                            </SelectTrigger>
                            <SelectContent>
                                {contents.map(content => (
                                    <SelectItem key={content.id} value={content.id.toString()}>
                                        <span>{content.title}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="sm:justify-center">
                    <Button onClick={onSubmit} disabled={!selectedContentId} className="w-full sm:w-auto h-11 px-8 text-lg gap-2">
                        <Zap className="w-5 h-5" />
                        بدء التحدي
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
