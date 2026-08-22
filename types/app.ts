export type AppRole = "employee" | "manager" | "bookkeeper";

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  locale: string;
};

export type Company = {
  id: string;
  name: string;
};

export type ActiveMembership = {
  id: string;
  role: AppRole;
  company: Company;
};

export type AuthContext = {
  userId: string;
  email: string;
  profile: Profile | null;
  memberships: ActiveMembership[];
  membership: ActiveMembership | null;
};
