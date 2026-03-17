"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import {
  CreateProjectSchema,
  type CreateProjectSchemaType,
} from "~/zodSchema/project";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

interface Props {
  orgId: string;
  onSuccess?: () => void;
}

export const CreateNewProjectForm: React.FC<Props> = ({ orgId, onSuccess }) => {
  const utils = api.useUtils();

  const form = useForm<CreateProjectSchemaType>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: { name: "", description: "", orgId },
  });

  const { mutate: createProject, isPending } = api.project.create.useMutation({
    onError: () => {
      toast.error("Failed to create project. Please try again.");
    },
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.error.message);
        return;
      }
      toast.success(response.message ?? "Project created successfully!");
      form.reset();
      onSuccess?.();
    },
    onSettled: () => {
      void utils.project.getAll.invalidate();
    },
  });

  function onSubmit(data: CreateProjectSchemaType) {
    createProject(data);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Project Name</FieldLabel>
            <Input
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="My Awesome Project"
              autoComplete="off"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="description"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </FieldLabel>
            <Textarea
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="What is this project about?"
              rows={3}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="flex justify-end gap-3">
        <Button type="submit" isLoading={isPending}>
          Create Project
        </Button>
      </div>
    </form>
  );
};
