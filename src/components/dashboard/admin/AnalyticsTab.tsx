import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, Users, BookOpen, Trophy } from "lucide-react";

const DATA_MONTHLY_ACTIVITY = [
    { name: "محرم", students: 400, challenges: 240 },
    { name: "صفر", students: 600, challenges: 340 },
    { name: "ربيع 1", students: 800, challenges: 450 },
    { name: "ربيع 2", students: 1000, challenges: 600 },
    { name: "جمادى 1", students: 1200, challenges: 500 },
    { name: "جمادى 2", students: 1500, challenges: 780 },
];

const DATA_SUBJECTS_PERFORMANCE = [
    { name: "الرياضيات", score: 85 },
    { name: "العلوم", score: 78 },
    { name: "لغتي", score: 92 },
    { name: "إنجليزي", score: 74 },
    { name: "إسلاميات", score: 95 },
    { name: "اجتماعيات", score: 88 },
];

const DATA_GRADE_DISTRIBUTION = [
    { name: "ممتاز", value: 450, color: "#10b981" },
    { name: "جيد جداً", value: 300, color: "#3b82f6" },
    { name: "جيد", value: 150, color: "#f59e0b" },
    { name: "مقبول", value: 80, color: "#ef4444" },
];

const AnalyticsTab = () => {
    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">معدل النمو</p>
                            <p className="text-2xl font-bold">+12%</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">الطلاب الجدد</p>
                            <p className="text-2xl font-bold">+320</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">إكمال الدروس</p>
                            <p className="text-2xl font-bold">85%</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">التحديات المنجزة</p>
                            <p className="text-2xl font-bold">14.2k</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">النمو الشهري</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={DATA_MONTHLY_ACTIVITY}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Line type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={3} name="الطلاب" />
                                    <Line type="monotone" dataKey="challenges" stroke="#8b5cf6" strokeWidth={3} name="التحديات" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">أداء المواد الدراسية (متوسط الدرجات)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={DATA_SUBJECTS_PERFORMANCE}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis domain={[0, 100]} />
                                    <RechartsTooltip />
                                    <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} name="الدرجة" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">توزيع مستويات الطلاب</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full flex items-center justify-center" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={DATA_GRADE_DISTRIBUTION}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {DATA_GRADE_DISTRIBUTION.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mt-4">
                            {DATA_GRADE_DISTRIBUTION.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1 text-sm">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span>{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg">أعلى المدارس نشاطاً (تجريبي)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold">
                                        {i}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-medium">المدرسة الابتدائية {i}</span>
                                            <span className="text-sm text-muted-foreground">{90 - i * 3}% نشاط</span>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: `${90 - i * 3}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AnalyticsTab;
