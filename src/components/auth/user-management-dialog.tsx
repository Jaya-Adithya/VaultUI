"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface UserManagementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

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

export function UserManagementDialog({ open, onOpenChange }: UserManagementDialogProps) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const { data: users, isLoading, refetch } = trpc.user.getAll.useQuery(undefined, {
        enabled: open,
    });

    const utils = trpc.useUtils();
    const updateRoleMutation = trpc.user.setRole.useMutation({
        onSuccess: () => {
            toast.success("User role updated");
            refetch();
            utils.invalidate();
        },
        onError: (error) => {
            toast.error(error.message);
        }
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
            toast.error(error.message);
        }
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

    const handleRoleChange = (userId: string, newRole: "user" | "developer" | "superadmin") => {
        updateRoleMutation.mutate({ userId, role: newRole });
    };

    const onSubmit = (data: CreateUserForm) => {
        createUserMutation.mutate(data);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle>Manage Users</DialogTitle>
                                <DialogDescription>
                                    View and manage user roles and permissions.
                                </DialogDescription>
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
                    </DialogHeader>

                    <div className="flex-1 overflow-auto py-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users?.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.image || undefined} />
                                                <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{user.name}</span>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === 'superadmin' ? 'default' : 'secondary'}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Select
                                                defaultValue={user.role}
                                                onValueChange={(val) => handleRoleChange(user.id, val as "user" | "developer" | "superadmin")}
                                                disabled={updateRoleMutation.isPending}
                                            >
                                                <SelectTrigger className="w-[130px] ml-auto">
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="user">User</SelectItem>
                                                    <SelectItem value="developer">Developer</SelectItem>
                                                    <SelectItem value="superadmin">Superadmin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create User Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                            Add a new user to the system. They will be able to sign in with their email and password.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                {...register("name")}
                                placeholder="John Doe"
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                {...register("email")}
                                placeholder="john.doe@position2.com"
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                {...register("password")}
                                placeholder="Minimum 8 characters"
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">{errors.password.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={selectedRole}
                                onValueChange={(value) => {
                                    setValue("role", value as "user" | "developer" | "superadmin");
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="developer">Developer</SelectItem>
                                    <SelectItem value="superadmin">Superadmin</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.role && (
                                <p className="text-sm text-destructive">{errors.role.message}</p>
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
        </>
    );
}
