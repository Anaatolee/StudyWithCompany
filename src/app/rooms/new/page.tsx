import { redirect } from "next/navigation";

// La création de salle se fait désormais via la modale (overlay) du dashboard,
// au-dessus de la page principale floutée. On redirige donc l'ancienne route.
export default function NewRoomPage() {
  redirect("/rooms");
}
