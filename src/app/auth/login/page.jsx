import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/app/auth/login-panel";
import { CHECKLAB_AUTH_COOKIE_NAME, isValidCheckLabToken, } from "@/app/auth/session";
export default function LoginPage() {
    const token = cookies().get(CHECKLAB_AUTH_COOKIE_NAME)?.value;
    if (isValidCheckLabToken(token)) {
        redirect("/");
    }
    return <LoginPanel />;
}
