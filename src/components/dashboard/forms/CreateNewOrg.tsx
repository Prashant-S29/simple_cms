"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { slugify } from "~/lib/utils";
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

  const { mutate: createOrg } = api.org.create.useMutation({
    onMutate: async (input) => {
      await utils.org.getAll.cancel();

      const defaultKey = { page: 1, limit: 10, search: undefined };
      const previousResponse = utils.org.getAll.getData(defaultKey);

      if (previousResponse?.data) {
        const optimistic = {
          id: crypto.randomUUID(),
          name: input.name,
          slug: slugify(input.name),
          createdAt: new Date(),
          projectCount: 0,
        };

        const prev = previousResponse.data;

        utils.org.getAll.setData(defaultKey, {
          ...previousResponse,
          data: {
            ...prev,
            items: [optimistic, ...prev.items].slice(0, 10),
            total: prev.total + 1,
            hasNext: prev.total + 1 > 10,
            nextPage: prev.total + 1 > 10 ? 2 : null,
          },
        });
      }

      return { previousResponse, defaultKey };
    },

    onError: (_err, _input, context) => {
      if (context?.previousResponse) {
        utils.org.getAll.setData(context.defaultKey, context.previousResponse);
      }
      toast.error("Failed to create organization. Please try again.");
    },

    onSuccess: (response, _input, context) => {
      if (response.error) {
        if (context?.previousResponse) {
          utils.org.getAll.setData(
            context.defaultKey,
            context.previousResponse,
          );
        }
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
        <Button type="submit" isLoading={form.formState.isSubmitting}>
          Create Organisation
        </Button>
      </div>
    </form>
  );
};
