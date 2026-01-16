import { redirect } from "next/navigation"

// Redirect to household settings where invite functionality exists
export default function InvitePage() {
  redirect("/settings/household")
}
