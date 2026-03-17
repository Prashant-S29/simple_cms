"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Key01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { api } from "~/trpc/react";
import { JoinOrgSchema, type JoinOrgSchemaType } from "~/zodSchema/orgMember";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";

export const JoinOrgPage: React.FC = () => {
  const router = useRouter();

  const form = useForm<JoinOrgSchemaType>({
    resolver: zodResolver(JoinOrgSchema),
    defaultValues: { inviteCode: "" },
  });

  const { mutate: joinOrg, isPending } = api.orgMember.join.useMutation({
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.error.message);
        return;
      }

      toast.success(response.message ?? "You have joined the organization!");
      form.reset();

      const slug = (response.data as { orgSlug: string } | null)?.orgSlug;
      if (slug) {
        router.push(`/dashboard/org/${slug}`);
      } else {
        router.push("/dashboard");
      }
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.");
    },
  });

  function onSubmit(data: JoinOrgSchemaType) {
    joinOrg(data);
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="bg-muted mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl">
            <HugeiconsIcon icon={Key01Icon} size={28} />
          </div>
          <h1 className="text-2xl font-semibold">Join an Organization</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter the invite code you received in your invitation email to join
            the organization.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-card rounded-2xl border p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <Controller
              name="inviteCode"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Invite Code</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="CMS-XXXXXX"
                    autoComplete="off"
                    autoFocus
                    className="font-mono tracking-widest uppercase"
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                  <p className="text-muted-foreground mt-1.5 text-xs">
                    Format: CMS-XXXXXX — check your invitation email.
                  </p>
                </Field>
              )}
            />

            <Button type="submit" className="w-full" isLoading={isPending}>
              {!isPending && (
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              )}
              Join Organization
            </Button>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-muted-foreground mt-5 text-center text-xs">
          Don&apos;t have an invite code?{" "}
          <span className="text-foreground font-medium">
            Ask the organization owner or admin to invite you.
          </span>
        </p>
      </div>
    </div>
  );
};
