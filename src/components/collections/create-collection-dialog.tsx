"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FolderPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    parentId: z.string().optional(),
});

interface CreateCollectionDialogProps {
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    collections?: { id: string; name: string }[];
}

export function CreateCollectionDialog({
    trigger,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    collections = [],
}: CreateCollectionDialogProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const router = useRouter();
    const utils = trpc.useUtils();

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const setOpen = isControlled ? setControlledOpen! : setUncontrolledOpen;

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            parentId: undefined, // "none" text value handled by Select
        },
    });

    const createMutation = trpc.collection.create.useMutation({
        onSuccess: () => {
            utils.collection.list.invalidate();
            setOpen(false);
            reset();
            router.refresh();
        },
    });

    const onSubmit = (data: z.infer<typeof formSchema>) => {
        createMutation.mutate({
            name: data.name,
            parentId: data.parentId === "none" ? undefined : data.parentId,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Collection</DialogTitle>
                    <DialogDescription>
                        Organize your components by creating a new collection (category).
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Buttons, Inputs, Layouts"
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="parent">Parent Collection (Optional)</Label>
                        <Select
                            onValueChange={(value) =>
                                setValue("parentId", value === "none" ? undefined : value)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a parent..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None (Root Level)</SelectItem>
                                {collections.map((col) => (
                                    <SelectItem key={col.id} value={col.id}>
                                        {col.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                            {createMutation.isPending ? "Creating..." : "Create Collection"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
