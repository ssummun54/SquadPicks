
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data); // { email, password }
      navigate("/");
    } catch {
      setError("password", { message: "Invalid email or password" });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}
    >
      <h2>Login</h2>

      <label htmlFor="email">Email</label>
      <input id="email" type="email" placeholder="you@example.com" {...register("email")} />
      {errors.email && <small style={{ color: "red" }}>{errors.email.message}</small>}

      <label htmlFor="password">Password</label>
      <input id="password" type="password" placeholder="••••••••" {...register("password")} />
      {errors.password && <small style={{ color: "red" }}>{errors.password.message}</small>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
