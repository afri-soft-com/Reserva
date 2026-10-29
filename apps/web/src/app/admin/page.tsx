import { redirect } from "next/navigation";

/** /admin sans sous-route → pilotage (évite 404 console). */
export default function PageAdminIndex() {
  redirect("/admin/pilotage");
}
