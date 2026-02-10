"use client";

import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, Calendar, Mail, User as UserIcon, Settings, Lock, Users } from "lucide-react";
import { UserManagement } from "@/components/auth/user-management";

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const { data: stats, isLoading: statsLoading } = trpc.user.getProfileStats.useQuery();

    if (status === "loading" || statsLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!session?.user) {
        return (
            <div className="container mx-auto py-10 text-center">
                <h2 className="text-2xl font-bold">Access Denied</h2>
                <p className="text-muted-foreground">Please sign in to view your profile.</p>
            </div>
        );
    }

    const user = session.user;
    const userInitials = user.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || user.email?.[0]?.toUpperCase() || "U";

    return (
        <div className="container max-w-5xl mx-auto py-10 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                    <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                    <AvatarFallback className="text-4xl">{userInitials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2 pt-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold">{user.name}</h1>
                        <Badge variant={user.role === 'superadmin' ? 'default' : 'secondary'} className="text-sm px-3 py-1 capitalize">
                            {user.role === 'superadmin' && <Shield className="w-3 h-3 mr-1 inline" />}
                            {user.role}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Mail className="w-4 h-4" /> {user.email}
                    </p>
                    {stats?.memberSince && (
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Member since {format(new Date(stats.memberSince), "MMMM d, yyyy")}
                        </p>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="general" className="w-full">
                <TabsList className={`grid w-full ${user.role === "superadmin" ? "grid-cols-3" : "grid-cols-2"} lg:w-[600px]`}>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    {user.role === "superadmin" && (
                        <TabsTrigger value="users" className="gap-2">
                            <Users className="h-4 w-4" />
                            User Management
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>
                                Manage your public profile details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Display Name</Label>
                                <div className="flex gap-2">
                                    <Input id="name" defaultValue={user.name || ""} disabled className="bg-muted/50" />
                                    <Button variant="outline" size="icon" disabled>
                                        <Lock className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Managed by your Google account.</p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="flex gap-2">
                                    <Input id="email" defaultValue={user.email || ""} disabled className="bg-muted/50" />
                                    <Button variant="outline" size="icon" disabled>
                                        <Lock className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Used for sign-in and notifications.</p>
                            </div>
                        </CardContent>
                    </Card>

                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Authentication Method</CardTitle>
                            <CardDescription>
                                How you log in to your account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 border p-4 rounded-lg">
                                <svg className="h-6 w-6" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <div>
                                    <p className="font-medium">Google</p>
                                    <p className="text-sm text-muted-foreground">Connected via {user.email}</p>
                                </div>
                                <Badge variant="outline" className="ml-auto">Active</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-destructive/50">
                        <CardHeader>
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                            <CardDescription>
                                Irreversible actions for your account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="destructive" disabled>Delete Account</Button>
                            <p className="text-xs text-muted-foreground mt-2">
                                Deleting your account will remove all your data permanently. This action is currently disabled for safety.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* User Management Tab - Only visible to superadmin */}
                {user.role === "superadmin" && (
                    <TabsContent value="users" className="mt-6">
                        <UserManagement />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
