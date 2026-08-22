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
  const cleanToken = token.trim();

  // 1. Try RPC resolver (Security Definer, works for anonymous/incognito guests)
  const { data: rpcData, error: rpcError } = await supabase
    .rpc("get_invitation_by_token", { p_token: cleanToken });

  let invitation: any = null;
  if (!rpcError && rpcData && rpcData.length > 0) {
    const row = rpcData[0];
    invitation = {
      id: row.id,
      token: row.token,
      role: row.role,
      email: row.email,
      expires_at: row.expires_at,
      used_at: row.used_at,
      companyName: row.company_name,
      companyTaxId: row.company_tax_id,
    };
  } else {
    // 2. Fallback to direct query
    const { data: directData } = await supabase
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
      .eq("token", cleanToken)
      .maybeSingle();

    if (directData) {
      const company = Array.isArray(directData.companies)
        ? directData.companies[0]
        : directData.companies;
      invitation = {
        id: directData.id,
        token: directData.token,
        role: directData.role,
        email: directData.email,
        expires_at: directData.expires_at,
        used_at: directData.used_at,
        companyName: company?.name || "Company",
        companyTaxId: company?.tax_id || "",
      };
    }
  }

  if (!invitation) {
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

  return {
    ok: true,
    data: {
      token: invitation.token,
      role: invitation.role as "employee" | "manager",
      email: invitation.email,
      companyName: invitation.companyName || "Company",
      companyTaxId: invitation.companyTaxId || "",
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
