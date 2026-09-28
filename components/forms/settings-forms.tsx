"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addAllowlistEntry,
  removeAllowlistEntry,
  changeUserRole,
  updateSettings,
} from "@/lib/actions/settings";
import type { Role } from "@/lib/supabase/types";

interface AllowlistEntry {
  email: string;
  role: Role;
}
interface UserRow {
  id: string;
  email: string;
  role: Role;
}

export function AllowlistManager({ entries }: { entries: AllowlistEntry[] }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("collector");
  const [isPending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      const result = await addAllowlistEntry({ email, role });
      if (!result.ok) {
        toast.error(result.error ?? "Failed to add");
        return;
      }
      toast.success("Added to allowlist");
      setEmail("");
    });
  }

  function remove(e: string) {
    startTransition(async () => {
      const result = await removeAllowlistEntry(e);
      if (!result.ok) toast.error(result.error ?? "Failed to remove");
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="email@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="collector">Collector</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={add} disabled={isPending || !email}>
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {entries.map((e) => (
          <Card key={e.email}>
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium">{e.email}</p>
                <p className="text-xs text-muted-foreground">{e.role}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(e.email)} disabled={isPending}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function UserRoleManager({ users }: { users: UserRow[] }) {
  const [isPending, startTransition] = useTransition();

  function setRole(id: string, role: Role) {
    startTransition(async () => {
      const result = await changeUserRole(id, role);
      if (!result.ok) toast.error(result.error ?? "Failed to update role");
      else toast.success("Role updated");
    });
  }

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <Card key={u.id}>
          <CardContent className="flex items-center justify-between p-3">
            <p className="text-sm font-medium">{u.email}</p>
            <Select value={u.role} onValueChange={(v) => setRole(u.id, v as Role)} disabled={isPending}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="collector">Collector</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DefaultsForm({
  defaultRatePercent,
  defaultPenaltyType,
  defaultPenaltyValue,
}: {
  defaultRatePercent: number;
  defaultPenaltyType: "PERCENT" | "FIXED" | "NONE";
  defaultPenaltyValue?: number;
}) {
  const [rate, setRate] = useState(String(defaultRatePercent));
  const [penaltyType, setPenaltyType] = useState(defaultPenaltyType);
  const [penaltyValue, setPenaltyValue] = useState(defaultPenaltyValue ? String(defaultPenaltyValue) : "");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateSettings({
        defaultRatePercent: Number(rate),
        defaultPenaltyType: penaltyType,
        defaultPenaltyValue: penaltyType === "NONE" ? undefined : Number(penaltyValue),
      });
      if (!result.ok) toast.error(result.error ?? "Failed to save");
      else toast.success("Defaults saved");
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Default rate %</Label>
        <Input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Default penalty</Label>
          <Select value={penaltyType} onValueChange={(v) => setPenaltyType(v as typeof penaltyType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="PERCENT">Percent</SelectItem>
              <SelectItem value="FIXED">Fixed (₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {penaltyType !== "NONE" && (
          <div className="space-y-1.5">
            <Label>Value</Label>
            <Input inputMode="decimal" value={penaltyValue} onChange={(e) => setPenaltyValue(e.target.value)} />
          </div>
        )}
      </div>
      <Button onClick={save} disabled={isPending}>
        Save defaults
      </Button>
    </div>
  );
}
