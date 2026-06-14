import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import ciplaLogo from "@assets/WhatsApp_Image_2026-06-09_at_6.43.04_PM_1781461513497.jpeg";
import defeatHepLogo from "@assets/logo1_(1)_1781461513495.png";
import tenvirLogo from "@assets/logo2_(1)_1781461513496.png";
import recordsLogo from "@assets/logo_(1)_1781461513494.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        toast.success("Login successful");
      },
      onError: (error) => {
        toast.error("Invalid credentials. Please try again.");
      }
    }
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center mb-4">
          <img src={ciplaLogo} alt="Cipla" className="h-16 object-contain" />
        </div>
        
        <Card className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="h-2 w-full bg-primary" />
          <CardHeader className="space-y-1 text-center pt-8">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Command Center</CardTitle>
            <CardDescription>Enter your credentials to access the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username / Employee Code</Label>
                <Input 
                  id="username" 
                  placeholder="Enter your username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11"
                  disabled={loginMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  disabled={loginMutation.isPending}
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base mt-2" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Sign In
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-center gap-6 py-6 bg-muted/30">
            <img src={defeatHepLogo} alt="Defeat Hepatitis" className="h-12 object-contain" />
            <img src={tenvirLogo} alt="Tenvir AF" className="h-12 object-contain" />
            <img src={recordsLogo} alt="International Book of Records" className="h-12 object-contain" />
          </CardFooter>
        </Card>
        
        <div className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} CIPLA Defeat Hepatitis Campaign. All rights reserved.
        </div>
      </div>
    </div>
  );
}
