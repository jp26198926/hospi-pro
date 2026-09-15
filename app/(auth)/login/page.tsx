import { LoginForm } from "@/components/auth/login-form";
import { getAppSettings } from "@/lib/settings";

export async function generateMetadata() {
  const settings = await getAppSettings();
  return {
    title: `Login - ${settings.appName}`,
    description: `Sign in to ${settings.appName}`,
  };
}

export default function LoginPage() {
  return <LoginForm />;
}
