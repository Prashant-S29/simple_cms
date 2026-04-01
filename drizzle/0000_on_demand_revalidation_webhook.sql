CREATE TYPE "public"."invitation_role" AS ENUM('admin', 'manager');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'expired', 'joined');--> statement-breakpoint
CREATE TYPE "public"."org_member_role" AS ENUM('owner', 'admin', 'manager');--> statement-breakpoint
CREATE TYPE "public"."org_member_status" AS ENUM('active', 'removed');--> statement-breakpoint
CREATE TYPE "public"."api_key_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."client_type" AS ENUM('browser', 'server', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."language_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "org" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"invite_code" text NOT NULL,
	"createdById" uuid NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone,
	CONSTRAINT "org_slug_unique" UNIQUE("slug"),
	CONSTRAINT "org_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "org_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orgId" uuid NOT NULL,
	"email" text NOT NULL,
	"invitedUserId" uuid,
	"role" "invitation_role" NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"invitedById" uuid NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "org_invitation_project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitationId" uuid NOT NULL,
	"projectId" uuid NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orgId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" "org_member_role" NOT NULL,
	"status" "org_member_status" DEFAULT 'active' NOT NULL,
	"invitedById" uuid,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "org_member_project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orgMemberId" uuid NOT NULL,
	"projectId" uuid NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"action" text NOT NULL,
	"resourceType" text NOT NULL,
	"resourceId" text NOT NULL,
	"resourceSlug" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_request_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"apiKeyId" uuid,
	"endpoint" text NOT NULL,
	"resourceSlug" text,
	"locale" text,
	"statusCode" integer NOT NULL,
	"errorCode" text,
	"durationMs" integer NOT NULL,
	"responseSizeBytes" integer,
	"ipHash" text,
	"country" text,
	"client_type" "client_type" DEFAULT 'unknown' NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"slug" text NOT NULL,
	"createdById" uuid NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "blog_post_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postId" uuid NOT NULL,
	"projectId" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text,
	"excerpt" text,
	"coverImage" text,
	"body" text,
	"authorName" text,
	"authorDesignation" text,
	"authorCompany" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"customMeta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"publishedAt" timestamp with time zone,
	"updatedById" uuid,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cms_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schemaId" uuid NOT NULL,
	"projectId" uuid NOT NULL,
	"locale" text NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updatedById" uuid,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cms_schema" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"schemaStructure" jsonb,
	"createdById" uuid NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"orgId" uuid NOT NULL,
	"createdById" uuid NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone,
	"webhookUrl" text,
	"webhookSecret" text
);
--> statement-breakpoint
CREATE TABLE "project_api_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"name" text NOT NULL,
	"keyHash" text NOT NULL,
	"keyPrefix" text NOT NULL,
	"status" "api_key_status" DEFAULT 'active' NOT NULL,
	"lastUsedAt" timestamp with time zone,
	"createdById" uuid NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"revokedAt" timestamp with time zone,
	"revokedById" uuid,
	CONSTRAINT "project_api_key_keyHash_unique" UNIQUE("keyHash")
);
--> statement-breakpoint
CREATE TABLE "project_language" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"locale" text NOT NULL,
	"label" text NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"status" "language_status" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "org" ADD CONSTRAINT "org_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invitation" ADD CONSTRAINT "org_invitation_orgId_org_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invitation" ADD CONSTRAINT "org_invitation_invitedUserId_user_id_fk" FOREIGN KEY ("invitedUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invitation" ADD CONSTRAINT "org_invitation_invitedById_user_id_fk" FOREIGN KEY ("invitedById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invitation_project" ADD CONSTRAINT "org_invitation_project_invitationId_org_invitation_id_fk" FOREIGN KEY ("invitationId") REFERENCES "public"."org_invitation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invitation_project" ADD CONSTRAINT "org_invitation_project_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_member" ADD CONSTRAINT "org_member_orgId_org_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_member" ADD CONSTRAINT "org_member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_member" ADD CONSTRAINT "org_member_invitedById_user_id_fk" FOREIGN KEY ("invitedById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_member_project" ADD CONSTRAINT "org_member_project_orgMemberId_org_member_id_fk" FOREIGN KEY ("orgMemberId") REFERENCES "public"."org_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_member_project" ADD CONSTRAINT "org_member_project_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_request_log" ADD CONSTRAINT "api_request_log_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_request_log" ADD CONSTRAINT "api_request_log_apiKeyId_project_api_key_id_fk" FOREIGN KEY ("apiKeyId") REFERENCES "public"."project_api_key"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_content" ADD CONSTRAINT "blog_post_content_postId_blog_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."blog_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_content" ADD CONSTRAINT "blog_post_content_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_content" ADD CONSTRAINT "blog_post_content_updatedById_user_id_fk" FOREIGN KEY ("updatedById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_content" ADD CONSTRAINT "cms_content_schemaId_cms_schema_id_fk" FOREIGN KEY ("schemaId") REFERENCES "public"."cms_schema"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_content" ADD CONSTRAINT "cms_content_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_content" ADD CONSTRAINT "cms_content_updatedById_user_id_fk" FOREIGN KEY ("updatedById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_schema" ADD CONSTRAINT "cms_schema_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_schema" ADD CONSTRAINT "cms_schema_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_orgId_org_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_api_key" ADD CONSTRAINT "project_api_key_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_api_key" ADD CONSTRAINT "project_api_key_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_api_key" ADD CONSTRAINT "project_api_key_revokedById_user_id_fk" FOREIGN KEY ("revokedById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_language" ADD CONSTRAINT "project_language_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_slug_idx" ON "org" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "org_invite_code_idx" ON "org" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "org_created_by_idx" ON "org" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "org_invitation_org_idx" ON "org_invitation" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "org_invitation_email_idx" ON "org_invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "org_invitation_status_idx" ON "org_invitation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "org_inv_proj_inv_idx" ON "org_invitation_project" USING btree ("invitationId");--> statement-breakpoint
CREATE INDEX "org_inv_proj_proj_idx" ON "org_invitation_project" USING btree ("projectId");--> statement-breakpoint
CREATE UNIQUE INDEX "org_inv_proj_unique_idx" ON "org_invitation_project" USING btree ("invitationId","projectId");--> statement-breakpoint
CREATE INDEX "org_member_org_idx" ON "org_member" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "org_member_user_idx" ON "org_member" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "org_member_unique_idx" ON "org_member" USING btree ("orgId","userId");--> statement-breakpoint
CREATE INDEX "org_member_proj_member_idx" ON "org_member_project" USING btree ("orgMemberId");--> statement-breakpoint
CREATE INDEX "org_member_proj_proj_idx" ON "org_member_project" USING btree ("projectId");--> statement-breakpoint
CREATE UNIQUE INDEX "org_member_proj_unique_idx" ON "org_member_project" USING btree ("orgMemberId","projectId");--> statement-breakpoint
CREATE INDEX "activity_log_project_time_idx" ON "activity_log" USING btree ("projectId","createdAt");--> statement-breakpoint
CREATE INDEX "activity_log_user_idx" ON "activity_log" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "activity_log_action_idx" ON "activity_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "activity_log_resource_type_idx" ON "activity_log" USING btree ("resourceType");--> statement-breakpoint
CREATE INDEX "req_log_project_time_idx" ON "api_request_log" USING btree ("projectId","createdAt");--> statement-breakpoint
CREATE INDEX "req_log_api_key_idx" ON "api_request_log" USING btree ("apiKeyId");--> statement-breakpoint
CREATE INDEX "req_log_endpoint_idx" ON "api_request_log" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "req_log_status_idx" ON "api_request_log" USING btree ("statusCode");--> statement-breakpoint
CREATE INDEX "req_log_country_idx" ON "api_request_log" USING btree ("country");--> statement-breakpoint
CREATE INDEX "blog_post_project_idx" ON "blog_post" USING btree ("projectId");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_post_project_slug_idx" ON "blog_post" USING btree ("projectId","slug");--> statement-breakpoint
CREATE INDEX "blog_content_post_idx" ON "blog_post_content" USING btree ("postId");--> statement-breakpoint
CREATE INDEX "blog_content_project_idx" ON "blog_post_content" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "blog_content_locale_idx" ON "blog_post_content" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "blog_content_status_idx" ON "blog_post_content" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_content_post_locale_idx" ON "blog_post_content" USING btree ("postId","locale");--> statement-breakpoint
CREATE INDEX "cms_content_schema_idx" ON "cms_content" USING btree ("schemaId");--> statement-breakpoint
CREATE INDEX "cms_content_project_idx" ON "cms_content" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "cms_content_locale_idx" ON "cms_content" USING btree ("locale");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_content_schema_locale_idx" ON "cms_content" USING btree ("schemaId","locale");--> statement-breakpoint
CREATE INDEX "cms_schema_project_idx" ON "cms_schema" USING btree ("projectId");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_schema_project_slug_idx" ON "cms_schema" USING btree ("projectId","slug");--> statement-breakpoint
CREATE INDEX "project_slug_idx" ON "project" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "project_org_idx" ON "project" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "project_created_by_idx" ON "project" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "project_org_slug_unique_idx" ON "project" USING btree ("orgId","slug");--> statement-breakpoint
CREATE INDEX "api_key_project_idx" ON "project_api_key" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "api_key_hash_idx" ON "project_api_key" USING btree ("keyHash");--> statement-breakpoint
CREATE INDEX "api_key_status_idx" ON "project_api_key" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_lang_project_idx" ON "project_language" USING btree ("projectId");--> statement-breakpoint
CREATE UNIQUE INDEX "project_lang_unique_idx" ON "project_language" USING btree ("projectId","locale");