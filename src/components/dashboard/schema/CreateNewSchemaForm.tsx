"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import {
  CreateCmsSchemaSchema,
  type CreateCmsSchemaSchemaType,
} from "~/zodSchema/cmsSchema";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

interface Props {
  projectId: string;
  orgId: string;
  /** Receives the new schema's slug on success */
  onSuccess?: (slug: string) => void;
}

export const CreateNewSchemaForm: React.FC<Props> = ({
  projectId,
  orgId,
  onSuccess,
}) => {
  const utils = api.useUtils();

  const form = useForm<CreateCmsSchemaSchemaType>({
    resolver: zodResolver(CreateCmsSchemaSchema),
    defaultValues: { title: "", description: "", projectId, orgId },
  });

  const { mutate: createSchema, isPending } = api.cmsSchema.create.useMutation({
    onError: () => {
      toast.error("Failed to create schema. Please try again.");
    },
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.error.message);
        return;
      }
      toast.success(response.message ?? "Schema created successfully!");
      form.reset();
      onSuccess?.(response.data!.slug);
    },
    onSettled: () => {
      void utils.cmsSchema.getAll.invalidate();
    },
  });

  function onSubmit(data: CreateCmsSchemaSchemaType) {
    createSchema(data);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Controller
        name="title"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Schema Title</FieldLabel>
            <Input
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="e.g. Home Page, About Us"
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
              placeholder="What content does this schema manage?"
              rows={3}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="flex justify-end">
        <Button type="submit" isLoading={isPending}>
          Create Schema
        </Button>
      </div>
    </form>
  );
};
