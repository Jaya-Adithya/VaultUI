"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Search, Shield, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

const createUserSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address").refine(
        (email) => email.endsWith("@position2.com"),
        "Email must be from @position2.com domain"
    ),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["user", "developer", "superadmin"]).default("user"),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

type User = {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
    createdAt: Date;
};

export function UserManagement() {
    const { data: session } = useSession();
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [roleChangeDialog, setRoleChangeDialog] = useState<{
        open: boolean;
        user: User | null;
        newRole: "user" | "developer" | "superadmin" | null;
    }>({
        open: false,
        user: null,
        newRole: null,
    });

    const { data: users, isLoading, refetch } = trpc.user.getAll.useQuery();

    const utils = trpc.useUtils();
    const updateRoleMutation = trpc.user.setRole.useMutation({
        onSuccess: () => {
            toast.success("User role updated successfully");
            refetch();
            utils.invalidate();
            setRoleChangeDialog({ open: false, user: null, newRole: null });
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update user role");
        },
    });

    const createUserMutation = trpc.user.createUser.useMutation({
        onSuccess: () => {
            toast.success("User created successfully");
            refetch();
            utils.invalidate();
            setShowCreateDialog(false);
            reset();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create user");
        },
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        watch,
    } = useForm<CreateUserForm>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            role: "user",
        },
    });

    const selectedRole = watch("role");

    // Filter users based on search query
    const filteredUsers = useMemo(() => {
        if (!users) return [];
        if (!searchQuery.trim()) return users;

        const query = searchQuery.toLowerCase();
        return users.filter(
            (user) =>
                user.name?.toLowerCase().includes(query) ||
                user.email?.toLowerCase().includes(query) ||
                user.role.toLowerCase().includes(query)
        );
    }, [users, searchQuery]);

    // Group users by role for statistics
    const roleStats = useMemo(() => {
        if (!users) return { user: 0, developer: 0, superadmin: 0 };
        return users.reduce(
            (acc, user) => {
                acc[user.role as keyof typeof acc] =
                    (acc[user.role as keyof typeof acc] || 0) + 1;
                return acc;
            },
            { user: 0, developer: 0, superadmin: 0 }
        );
    }, [users]);

    const handleRoleChangeRequest = (
        user: User,
        newRole: "user" | "developer" | "superadmin"
    ) => {
        // Prevent changing own role
        if (session?.user?.id === user.id) {
            toast.error("You cannot change your own role");
            return;
        }

        setRoleChangeDialog({ open: true, user, newRole });
    };

    const handleRoleChangeConfirm = () => {
        if (!roleChangeDialog.user || !roleChangeDialog.newRole) return;

        updateRoleMutation.mutate({
            userId: roleChangeDialog.user.id,
            role: roleChangeDialog.newRole,
        });
    };

    const onSubmit = (data: CreateUserForm) => {
        createUserMutation.mutate(data);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {users?.length || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Developers
                        </CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {roleStats.developer}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Superadmins
                        </CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {roleStats.superadmin}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* User Management Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>
                                View and manage user roles and permissions.
                            </CardDescription>
                        </div>
                        <Button
                            onClick={() => setShowCreateDialog(true)}
                            size="sm"
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add User
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users by name, email, or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Users Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="text-center py-8 text-muted-foreground"
                                        >
                                            {searchQuery
                                                ? "No users found matching your search."
                                                : "No users found."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => {
                                        const isCurrentUser =
                                            session?.user?.id === user.id;
                                        return (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage
                                                                src={
                                                                    user.image ||
                                                                    undefined
                                                                }
                                                            />
                                                            <AvatarFallback>
                                                                {user.name?.[0]?.toUpperCase() ||
                                                                    "U"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                {user.name ||
                                                                    "Unknown"}
                                                            </span>
                                                            {isCurrentUser && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    (You)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {user.email || "N/A"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            user.role ===
                                                            "superadmin"
                                                                ? "default"
                                                                : user.role ===
                                                                  "developer"
                                                                ? "secondary"
                                                                : "outline"
                                                        }
                                                    >
                                                        {user.role ===
                                                        "superadmin" ? (
                                                            <>
                                                                <Shield className="w-3 h-3 mr-1 inline" />
                                                                {user.role}
                                                            </>
                                                        ) : (
                                                            user.role
                                                        )}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(
                                                        new Date(
                                                            user.createdAt
                                                        ),
                                                        "MMM d, yyyy"
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Select
                                                        value={user.role}
                                                        onValueChange={(
                                                            val
                                                        ) =>
                                                            handleRoleChangeRequest(
                                                                user,
                                                                val as
                                                                    | "user"
                                                                    | "developer"
                                                                    | "superadmin"
                                                            )
                                                        }
                                                        disabled={
                                                            updateRoleMutation.isPending ||
                                                            isCurrentUser
                                                        }
                                                    >
                                                        <SelectTrigger
                                                            className="w-[140px] ml-auto"
                                                            aria-label={`Change role for ${user.name || user.email}`}
                                                        >
                                                            <SelectValue placeholder="Select role" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="user">
                                                                User
                                                            </SelectItem>
                                                            <SelectItem value="developer">
                                                                Developer
                                                            </SelectItem>
                                                            <SelectItem value="superadmin">
                                                                Superadmin
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Results count */}
                    {searchQuery && (
                        <p className="text-sm text-muted-foreground">
                            Showing {filteredUsers.length} of {users?.length || 0}{" "}
                            users
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Role Change Confirmation Dialog */}
            <AlertDialog
                open={roleChangeDialog.open}
                onOpenChange={(open) =>
                    !open &&
                    setRoleChangeDialog({
                        open: false,
                        user: null,
                        newRole: null,
                    })
                }
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="pt-2">
                            Are you sure you want to change{" "}
                            <strong>
                                {roleChangeDialog.user?.name ||
                                    roleChangeDialog.user?.email}
                            </strong>
                            's role from{" "}
                            <strong>{roleChangeDialog.user?.role}</strong> to{" "}
                            <strong>{roleChangeDialog.newRole}</strong>?
                            <br />
                            <br />
                            This action will immediately update the user's
                            permissions and access levels.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRoleChangeConfirm}
                            disabled={updateRoleMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {updateRoleMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Confirm Change"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Create User Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                            Add a new user to the system. They will be able to
                            sign in with their email and password.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                {...register("name")}
                                placeholder="John Doe"
                                aria-invalid={errors.name ? "true" : "false"}
                                aria-describedby={
                                    errors.name ? "name-error" : undefined
                                }
                            />
                            {errors.name && (
                                <p
                                    id="name-error"
                                    className="text-sm text-destructive"
                                    role="alert"
                                >
                                    {errors.name.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">
                                Email <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                {...register("email")}
                                placeholder="john.doe@position2.com"
                                aria-invalid={errors.email ? "true" : "false"}
                                aria-describedby={
                                    errors.email ? "email-error" : undefined
                                }
                            />
                            {errors.email && (
                                <p
                                    id="email-error"
                                    className="text-sm text-destructive"
                                    role="alert"
                                >
                                    {errors.email.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">
                                Password{" "}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                {...register("password")}
                                placeholder="Minimum 8 characters"
                                aria-invalid={
                                    errors.password ? "true" : "false"
                                }
                                aria-describedby={
                                    errors.password
                                        ? "password-error"
                                        : undefined
                                }
                            />
                            {errors.password && (
                                <p
                                    id="password-error"
                                    className="text-sm text-destructive"
                                    role="alert"
                                >
                                    {errors.password.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">
                                Role <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={selectedRole}
                                onValueChange={(value) => {
                                    setValue(
                                        "role",
                                        value as
                                            | "user"
                                            | "developer"
                                            | "superadmin"
                                    );
                                }}
                            >
                                <SelectTrigger id="role">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="developer">
                                        Developer
                                    </SelectItem>
                                    <SelectItem value="superadmin">
                                        Superadmin
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.role && (
                                <p
                                    className="text-sm text-destructive"
                                    role="alert"
                                >
                                    {errors.role.message}
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowCreateDialog(false);
                                    reset();
                                }}
                                disabled={createUserMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createUserMutation.isPending}
                            >
                                {createUserMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create User"
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}


