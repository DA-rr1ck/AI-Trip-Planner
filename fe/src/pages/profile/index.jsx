import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import avatarFallback from "@/assets/avatar.png";

// function fmt(d) {
//     if (!d) return "—";
//     const date = new Date(d);
//     if (Number.isNaN(date.getTime())) return "—";
//     return date.toLocaleString();
// }

export default function ProfilePage() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(!user);

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Your Profile</h1>
                {/* Placeholder for future Edit button */}
                <Button variant="outline" disabled>Edit (soon)</Button>
            </div>

            <div className="rounded-2xl border p-6 shadow-sm bg-white/60 dark:bg-black/20">
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
                        <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded" />
                        <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
                        <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-4">
                            <img
                                src={user?.avatar || user?.picture || avatarFallback}
                                alt={user?.username || user?.email || "avatar"}
                                className="h-20 w-20 rounded-full object-cover ring-2 ring-offset-2 ring-indigo-400"
                            />
                            <div>
                                <div className="text-xl font-semibold">
                                    {user?.username || "—"}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {user?.provider ? (
                                        <span className="inline-flex items-center gap-2">
                                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                                            {user.provider === "google" ? "Signed in with Google" : "Signed in with Email"}
                                        </span>
                                    ) : "—"}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 grid sm:grid-cols-2 gap-4">
                            <div className="rounded-lg border p-4">
                                <div className="text-xs uppercase text-muted-foreground">Email</div>
                                <div className="mt-1">{user?.email || "—"}</div>
                            </div>
                            <div className="rounded-lg border p-4">
                                <div className="text-xs uppercase text-muted-foreground">Phone</div>
                                <div className="mt-1">{user?.phone || "—"}</div>
                            </div>
                            <div className="rounded-lg border p-4">
                                <div className="text-xs uppercase text-muted-foreground">Password</div>
                                <div className="mt-1">********</div>
                            </div>
                            {/* <div className="rounded-lg border p-4">
                                <div className="text-xs uppercase text-muted-foreground">Provider</div>
                                <div className="mt-1">{user?.provider || "—"}</div>
                            </div> */}
                        </div>

                        {/* <div className="mt-6 grid sm:grid-cols-2 gap-4">
                            <div className="rounded-lg border p-4">
                                <div className="text-xs uppercase text-muted-foreground">Created</div>
                                <div className="mt-1">{fmt(user?.createdAt || user?.created)}</div>
                            </div>
                            <div className="rounded-lg border p-4">
                                <div className="text-xs uppercase text-muted-foreground">Last updated</div>
                                <div className="mt-1">{fmt(user?.updatedAt || user?.modified)}</div>
                            </div>
                        </div> */}
                    </>
                )}
            </div>
        </div>
    );
}
