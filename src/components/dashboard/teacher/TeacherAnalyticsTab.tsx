import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line
} from "recharts";
import { TrendingUp, Users, BookOpen, AlertCircle } from "lucide-react";

// Mock Data
const PERFORMANCE_DATA = [
    { name: "الأسبوع 1", avg: 75, participation: 60 },
    { name: "الأسبوع 2", avg: 78, participation: 65 },
    { name: "الأسبوع 3", avg: 82, participation: 75 },
    { name: "الأسبوع 4", avg: 85, participation: 80 },
    { name: "الأسبوع 5", avg: 88, participation: 85 },
    { name: "الأسبوع 6", avg: 87, participation: 82 },
];

const TOPIC_PERFORMANCE = [
    { name: "حروف الهجاء", score: 92 },
    { name: "الحركات", score: 85 },
    { name: "المدود", score: 78 },
    { name: "التنوين", score: 88 },
    { name: "اللام الشمسية", score: 70 },
];

const TeacherAnalyticsTab = () => {
    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500 rounded-lg text-white">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">تحسن المستوى</p>
                                <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">+12%</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500 rounded-lg text-white">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">نسبة الحضور</p>
                                <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">94%</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500 rounded-lg text-white">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">طلاب بحاجة لدعم</p>
                                <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300">3 طلاب</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">تطور مستوى الطلاب والنشاط</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={PERFORMANCE_DATA}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis domain={[0, 100]} />
                                    <RechartsTooltip />
                                    <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={3} name="متوسط الدرجات" />
                                    <Line type="monotone" dataKey="participation" stroke="#10b981" strokeWidth={3} name="المشاركة" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">أداء الدروس (متوسط درجات الاختبارات)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={TOPIC_PERFORMANCE} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <RechartsTooltip />
                                    <Bar dataKey="score" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="متوسط الدرجة" barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Weak Points Analysis */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        تحليل الفجوات التعليمية
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[
                            { skill: "التمييز بين الحروف المتشابهة", score: 65, status: "critical" },
                            { skill: "القراءة مع الحركات", score: 72, status: "warning" },
                            { skill: "الإملاء", score: 78, status: "warning" },
                            { skill: "الفهم والاستيعاب", score: 88, status: "good" },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <div className="w-full">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-medium text-sm">{item.skill}</span>
                                        <span className={`text-sm font-bold ${item.status === 'critical' ? 'text-red-500' :
                                                item.status === 'warning' ? 'text-amber-500' : 'text-emerald-500'
                                            }`}>{item.score}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${item.status === 'critical' ? 'bg-red-500' :
                                                    item.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                                                }`}
                                            style={{ width: `${item.score}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TeacherAnalyticsTab;
