import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getSessionUser();
  
  if (!user) {
    redirect("/auth/signin");
  }

  // Redirect to profile settings page where users can manage their profile
  redirect("/profile/settings");
}
