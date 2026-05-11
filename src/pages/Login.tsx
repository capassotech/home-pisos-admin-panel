import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import { auth } from "@/firebase"; // Importa la instancia de autenticación
import { signInWithEmailAndPassword } from "firebase/auth"; // Método de inicio de sesión

interface LoginProps {
  onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Intenta iniciar sesión con Firebase
      await signInWithEmailAndPassword(auth, email, password);
      setIsLoading(false);
      onLogin(); // Llama al callback de inicio de sesión exitoso
    } catch (err: any) {
      setIsLoading(false);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Correo electrónico o contraseña incorrectos.");
      } else {
        setError("Ocurrió un error inesperado. Por favor, inténtalo de nuevo.");
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-none shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-medium">Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingrese sus credenciales para acceder al panel de administración
            </CardDescription>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400">
                    <User size={18} />
                  </span>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Introduce tu correo electrónico"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400">
                    <Lock size={18} />
                  </span>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingrese su contraseña"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            Desarrollado por Capasso Tech
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;