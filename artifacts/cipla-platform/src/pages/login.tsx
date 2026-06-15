import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, User, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import ibRecordsLogo   from "@assets/logo_(1)_1781526507622.png";
import defeatHepLogo   from "@assets/logo1_(1)_1781526507624.png";
import tenvirLogo      from "@assets/logo2_(1)_1781526507626.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        toast.success("Login successful");
      },
      onError: () => {
        toast.error("Invalid credentials. Please try again.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }
    loginMutation.mutate({ data: { username, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#f0f0f0" }}>
      <div className="w-full max-w-sm">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.18)", backgroundColor: "#fff" }}
        >
          {/* ── Logo strip ── */}
          <div className="flex items-center justify-between px-8 pt-8 pb-3 gap-4">
            <img
              src={ibRecordsLogo}
              alt="International Book of Records"
              className="h-14 w-14 object-contain flex-shrink-0"
            />
            <img
              src={defeatHepLogo}
              alt="Defeat Hepatitis"
              className="h-12 object-contain flex-shrink-0"
              style={{ maxWidth: 160 }}
            />
          </div>

          {/* ── Tenvir AF ── */}
          <div className="flex justify-center pb-4 px-8">
            <img
              src={tenvirLogo}
              alt="Tenvir AF"
              className="h-10 object-contain"
              style={{ maxWidth: 180 }}
            />
          </div>

          {/* ── Heading ── */}
          <div className="text-center px-8 pb-6">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Welcome Back</h1>
            <p className="text-sm text-gray-500 mt-0.5">Access your dashboard</p>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
            {/* Username */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <User className="w-4 h-4 text-white/80" />
                </span>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="w-full h-11 rounded-lg pl-10 pr-4 text-sm text-white placeholder-white/70 outline-none disabled:opacity-60"
                  style={{ backgroundColor: "#7A1512", border: "none" }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Lock className="w-4 h-4 text-white/80" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="w-full h-11 rounded-lg pl-10 pr-10 text-sm text-white placeholder-white/70 outline-none disabled:opacity-60"
                  style={{ backgroundColor: "#7A1512", border: "none" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-11 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 mt-2"
              style={{ backgroundColor: "#7A1512" }}
            >
              {loginMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          &copy; {new Date().getFullYear()} CIPLA Defeat Hepatitis Campaign. All rights reserved.
        </p>
      </div>
    </div>
  );
}
