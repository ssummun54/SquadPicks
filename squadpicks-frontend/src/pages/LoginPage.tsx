import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
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
      await login(data); // { username, password }
      navigate("/");
    } catch {
      setError("password", { message: "Invalid username or password" });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}
    >
      <h2>Login</h2>

      <label htmlFor="username">Username</label>
      <input id="username" type="text" placeholder="Username" {...register("username")} />
      {errors.username && <small style={{ color: "red" }}>{errors.username.message}</small>}

      <label htmlFor="password">Password</label>
      <input id="password" type="password" placeholder="••••••••" {...register("password")} />
      {errors.password && <small style={{ color: "red" }}>{errors.password.message}</small>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
