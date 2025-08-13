// src/pages/RegisterPage.tsx
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const schema = z
  .object({
    email: z.string().email("Valid email required"),
    password: z.string().min(6, "Min 6 characters"),
    confirmPassword: z.string().min(6, "Min 6 characters"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email, password }: FormData) => {
    try {
      // Backend expects: { email, password }
      await registerUser({ email, password });
      navigate("/");
    } catch (e: any) {
      // Basic error surfacing (tweak if your API returns field errors)
      setError("email", { message: "Registration failed. Try a different email." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <h2>Create account</h2>

      <label htmlFor="email">Email</label>
      <input id="email" type="email" placeholder="you@example.com" {...register("email")} />
      {errors.email && <small style={{ color: "red" }}>{errors.email.message}</small>}

      <label htmlFor="password">Password</label>
      <input id="password" type="password" placeholder="••••••••" {...register("password")} />
      {errors.password && <small style={{ color: "red" }}>{errors.password?.message}</small>}

      <label htmlFor="confirmPassword">Confirm password</label>
      <input id="confirmPassword" type="password" placeholder="••••••••" {...register("confirmPassword")} />
      {errors.confirmPassword && <small style={{ color: "red" }}>{errors.confirmPassword.message}</small>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Register"}
      </button>
    </form>
  );
}
