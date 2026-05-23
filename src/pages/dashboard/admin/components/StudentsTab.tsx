import { useState } from "react";
import {
    Search, Filter, MoreVertical, Trophy,
    Gamepad2, TrendingUp, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllUsers, useAdminStats } from "@/hooks/useDatabase";
import { useOrgAdminTenant } from "@/hooks/useOrgAdminTenant";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const StudentsTab = () => {
    const { t, dir, locale, isRtl } = useDashboardLocale();
    const [searchTerm, setSearchTerm] = useState("");
    const { allUsersOptions, adminStatsOptions } = useOrgAdminTenant();
    const { data: allUsers, isLoading } = useAllUsers(allUsersOptions);
    const { data: adminStats } = useAdminStats(adminStatsOptions);

    const students = (allUsers || []).filter((u: any) => u.role === "STUDENT");

    const filteredStudents = students.filter((student: any) =>
        student.name?.includes(searchTerm) ||
        student.email?.includes(searchTerm)
    );

    const searchIconPos = isRtl ? "right-3" : "left-3";
    const searchPad = isRtl ? "pr-9" : "pl-9";

    return (
        <div className="space-y-6" dir={dir}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{t("dash.admin.students.total")}</p>
                            <p className="text-2xl font-bold text-primary">{(adminStats?.totalStudents || students.length).toLocaleString(locale)}</p>
                        </div>
                        <User className="w-8 h-8 text-primary opacity-50" />
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{t("dash.admin.students.active")}</p>
                            <p className="text-2xl font-bold text-emerald-600">
                                {students.filter((s: any) => s.is_active !== false).length.toLocaleString(locale)}
                            </p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </CardContent>
                </Card>
                <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{t("dash.admin.students.challengesDone")}</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {adminStats?.totalChallenges || 0}
                            </p>
                        </div>
                        <Gamepad2 className="w-8 h-8 text-purple-600 opacity-50" />
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{t("dash.admin.students.totalSubjects")}</p>
                            <p className="text-2xl font-bold text-amber-600">
                                {adminStats?.totalSubjects || 0}
                            </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-amber-600 opacity-50" />
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", searchIconPos)} />
                    <Input
                        placeholder={t("dash.admin.students.search")}
                        className={searchPad}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    {t("dash.admin.students.filterGrade")}
                </Button>
            </div>

            <Card>
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-[50px] w-full" />
                        ))}
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-12">
                        <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-lg">{t("dash.admin.students.noStudents")}</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("dash.admin.students.colStudent")}</TableHead>
                                <TableHead>{t("dash.admin.students.colEmail")}</TableHead>
                                <TableHead className="text-center">{t("dash.admin.students.colPoints")}</TableHead>
                                <TableHead className="text-center">{t("dash.admin.students.colStatus")}</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.map((student: any) => (
                                <TableRow key={student.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <Avatar>
                                                    <AvatarImage src={student.avatar_url || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${student.id}`} />
                                                    <AvatarFallback>{student.name?.[0] || "S"}</AvatarFallback>
                                                </Avatar>
                                                <div className={cn(
                                                    "absolute bottom-0 w-3 h-3 rounded-full border-2 border-background",
                                                    isRtl ? "right-0" : "left-0",
                                                    student.is_active !== false ? "bg-emerald-500" : "bg-gray-300",
                                                )} />
                                            </div>
                                            <div>
                                                <p className="font-medium">{student.name || t("dash.admin.students.noName")}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(student.created_at).toLocaleDateString(locale)}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{student.email}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 font-bold text-amber-600">
                                            <Trophy className="w-4 h-4" />
                                            {student.points || 0}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={student.is_active !== false ? "default" : "secondary"}>
                                            {student.is_active !== false
                                                ? t("dash.admin.students.activeStatus")
                                                : t("dash.admin.students.inactiveStatus")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align={isRtl ? "end" : "start"}>
                                                <DropdownMenuItem>{t("dash.admin.students.viewProfile")}</DropdownMenuItem>
                                                <DropdownMenuItem>{t("dash.admin.students.sendMessage")}</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">{t("dash.admin.students.suspend")}</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </div>
    );
};

export default StudentsTab;
