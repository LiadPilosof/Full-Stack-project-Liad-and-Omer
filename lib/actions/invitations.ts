"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createInvitationSchema,
  type CreateInvitationInput,
} from "@/lib/validations/auth";

export async function createInvitationLink(input: CreateInvitationInput) {
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Unauthorized" };
  }

  // Calculate expires_at
  const expiresInDays = parsed.data.expiresInDays || 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      company_id: parsed.data.companyId,
      role: parsed.data.role,
      email: parsed.data.email || null,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select("id, token, role, company_id, expires_at")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: {
      ...invitation,
      inviteUrl: `/invite/${invitation.token}`,
    },
  };
}

export async function getInvitationDetails(token: string) {
  if (!token || typeof token !== "string") {
    return { ok: false, error: "Invalid invitation token" };
  }

  const supabase = await createClient();

  // Query invitation and join company name
  const { data: invitation, error } = await supabase
    .from("invitations")
    .select(`
      id,
      token,
      role,
      email,
      expires_at,
      used_at,
      companies (
        id,
        name,
        tax_id
      )
    `)
    .eq("token", token.trim())
    .single();

  if (error || !invitation) {
    return { ok: false, error: "Invitation not found or has been removed." };
  }

  if (invitation.used_at) {
    return { ok: false, error: "This invitation link has already been used." };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return {
      ok: false,
      error: "This invitation link has expired. Please request a new one from your company administrator.",
    };
  }

  const company = Array.isArray(invitation.companies)
    ? invitation.companies[0]
    : invitation.companies;

  return {
    ok: true,
    data: {
      token: invitation.token,
      role: invitation.role as "employee" | "manager",
      email: invitation.email,
      companyName: company?.name || "Company",
      companyTaxId: company?.tax_id || "",
    },
  };
}

export async function listBusinessInvitations(companyId: string) {
  if (!companyId) {
    return { ok: false, error: "Missing company ID", data: [] };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Unauthorized", data: [] };
  }

  const { data: invitations, error } = await supabase
    .from("invitations")
    .select(`
      id,
      token,
      role,
      email,
      expires_at,
      used_at,
      created_at
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message, data: [] };
  }

  return { ok: true, data: invitations || [] };
}
