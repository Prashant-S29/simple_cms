"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { CreateOrgSchema, type CreateOrgSchemaType } from "~/zodSchema/org";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";

interface Props {
  onSuccess?: () => void;
}

export const CreateNewOrgForm: React.FC<Props> = ({ onSuccess }) => {
  const utils = api.useUtils();
  const form = useForm<CreateOrgSchemaType>({
    resolver: zodResolver(CreateOrgSchema),
    defaultValues: { name: "" },
  });

  const { mutate: createOrg, isPending } = api.org.create.useMutation({
    onError: () => {
      toast.error("Failed to create organization. Please try again.");
    },
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.error.message);
        return;
      }
      toast.success(response.message ?? "Organization created successfully!");
      form.reset();
      onSuccess?.();
    },
    onSettled: () => {
      void utils.org.getAll.invalidate();
    },
  });

  function onSubmit(data: CreateOrgSchemaType) {
    createOrg(data);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Organisation Name</FieldLabel>
            <Input
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="Acme Corp"
              autoComplete="off"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="flex justify-end gap-3">
        <Button type="submit" isLoading={isPending}>
          Create Organisation
        </Button>
      </div>
    </form>
  );
};
