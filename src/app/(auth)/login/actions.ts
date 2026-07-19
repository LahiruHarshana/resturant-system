"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  try {
    const callbackUrl = formData.get("callbackUrl")?.toString() || "/";
    await signIn("credentials", {
      ...Object.fromEntries(formData),
      redirect: true,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials" };
        default:
          return { error: "Something went wrong." };
      }
    }
    return { error: "Something went wrong." };
  }
}
