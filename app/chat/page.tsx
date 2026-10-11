import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <ChatClient
      userName={session.user?.name ?? "User"}
      userEmail={session.user?.email ?? ""}
      userImage={session.user?.image ?? null}
    />
  );
}

export { signOut };
