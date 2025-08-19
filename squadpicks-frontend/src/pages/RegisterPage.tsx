// src/pages/RegisterPage.tsx
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const schema = z
  .object({
    username: z.string().min(1, "Username is required"),
    email: z.string().email("Valid email required"),
    password: z.string().min(6, "Min 6 characters"),
    confirmPassword: z.string().min(6, "Min 6 characters"),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    birthdate: z.string().min(1, "Birthdate is required"),
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

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser({
        username: data.username,
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        birthdate: data.birthdate,
      });
      navigate("/");
    } catch (e: any) {
      setError("username", { message: "Registration failed. Try a different username or email." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <h2>Create account</h2>

      <label htmlFor="username">Username</label>
      <input id="username" type="text" placeholder="Username" {...register("username")} />
      {errors.username && <small style={{ color: "red" }}>{errors.username.message}</small>}

      <label htmlFor="email">Email</label>
      <input id="email" type="email" placeholder="you@example.com" {...register("email")} />
      {errors.email && <small style={{ color: "red" }}>{errors.email.message}</small>}

      <label htmlFor="password">Password</label>
      <input id="password" type="password" placeholder="••••••••" {...register("password")} />
      {errors.password && <small style={{ color: "red" }}>{errors.password.message}</small>}

      <label htmlFor="confirmPassword">Confirm password</label>
      <input id="confirmPassword" type="password" placeholder="••••••••" {...register("confirmPassword")} />
      {errors.confirmPassword && <small style={{ color: "red" }}>{errors.confirmPassword.message}</small>}

      <label htmlFor="first_name">First Name</label>
      <input id="first_name" type="text" placeholder="First name" {...register("first_name")} />
      {errors.first_name && <small style={{ color: "red" }}>{errors.first_name.message}</small>}

      <label htmlFor="last_name">Last Name</label>
      <input id="last_name" type="text" placeholder="Last name" {...register("last_name")} />
      {errors.last_name && <small style={{ color: "red" }}>{errors.last_name.message}</small>}

      <label htmlFor="birthdate">Birthdate</label>
      <input id="birthdate" type="date" {...register("birthdate")} />
      {errors.birthdate && <small style={{ color: "red" }}>{errors.birthdate.message}</small>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Register"}
      </button>
    </form>
  );
}
