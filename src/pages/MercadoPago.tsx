import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Link, Unlink, User, Mail } from "lucide-react";

interface AccountInfo {
  userId: string;
  email: string | null;
  name: string | null;
}

interface ConnectionStatus {
  connected: boolean;
  source: "oauth" | "env" | "none";
  savedAt?: string;
  accountInfo?: AccountInfo | null;
}

const API_URL = import.meta.env.VITE_API_URL || "https://home-pisos-backend.onrender.com";
const MP_OAUTH_PENDING_KEY = "mp_oauth_pending";

const MercadoPago = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/mercadopago/status`);
      const data = await res.json();
      setStatus(data);
    } catch {
      toast.error("No se pudo verificar el estado de Mercado Pago.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const oauthStatus = searchParams.get("status");
    const reason = searchParams.get("reason");

    if (oauthStatus === "success") {
      sessionStorage.removeItem(MP_OAUTH_PENDING_KEY);
      toast.success("Cuenta de Mercado Pago conectada correctamente.");
      setSearchParams({}, { replace: true });
    } else if (oauthStatus === "error") {
      sessionStorage.removeItem(MP_OAUTH_PENDING_KEY);
      setConnecting(false);
      toast.error(`Error al conectar: ${reason || "error desconocido"}`);
      setSearchParams({}, { replace: true });
    } else if (sessionStorage.getItem(MP_OAUTH_PENDING_KEY)) {
      // Volvió atrás sin completar OAuth (bfcache o recarga)
      sessionStorage.removeItem(MP_OAUTH_PENDING_KEY);
      setConnecting(false);
    }

    const onPageShow = () => {
      if (sessionStorage.getItem(MP_OAUTH_PENDING_KEY)) {
        sessionStorage.removeItem(MP_OAUTH_PENDING_KEY);
        setConnecting(false);
      }
    };

    window.addEventListener("pageshow", onPageShow);
    fetchStatus();

    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch(`${API_URL}/api/mercadopago/oauth/url`);
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "No se pudo iniciar la conexión.");
        setConnecting(false);
        return;
      }
      const { url } = await res.json();
      sessionStorage.setItem(MP_OAUTH_PENDING_KEY, "1");
      window.location.href = url;
    } catch {
      toast.error("Error al conectar con Mercado Pago.");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("¿Desconectar la cuenta de Mercado Pago? Los pagos dejarán de procesarse.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`${API_URL}/api/mercadopago/disconnect`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Cuenta desconectada.");
      await fetchStatus();
    } catch {
      toast.error("Error al desconectar la cuenta.");
    } finally {
      setDisconnecting(false);
    }
  };

  const info = status?.accountInfo;
  const isOAuth = status?.connected;
  const isFallback = !status?.connected && status?.source === "env";
  const isNone = status?.source === "none";

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mercado Pago</h1>
        <p className="text-muted-foreground">
          Conectá la cuenta de Mercado Pago para recibir pagos en la tienda.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            {loading ? (
              <span className="text-muted-foreground">Verificando...</span>
            ) : isOAuth ? (
              <><CheckCircle2 className="text-green-500 h-5 w-5 shrink-0" /> Cuenta conectada</>
            ) : isFallback ? (
              <><CheckCircle2 className="text-amber-500 h-5 w-5 shrink-0" /> Cuenta de respaldo</>
            ) : (
              <><XCircle className="text-destructive h-5 w-5 shrink-0" /> Sin cuenta conectada</>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {!loading && (isOAuth || isFallback) && (
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              {info?.name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{info.name}</span>
                </div>
              )}
              {info?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{info.email}</span>
                </div>
              )}
              {isOAuth && status?.savedAt && (
                <p className="text-xs text-muted-foreground pt-1">
                  Vinculada el {new Date(status.savedAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
              {isFallback && (
                <p className="text-xs text-muted-foreground pt-1">
                  Esta es la cuenta configurada por defecto. Podés reemplazarla conectando tu propia cuenta de Mercado Pago.
                </p>
              )}
            </div>
          )}

          {!loading && isNone && (
            <p className="text-sm text-muted-foreground">
              No hay ninguna cuenta configurada. Conectá una cuenta para poder recibir pagos.
            </p>
          )}

          {!loading && !isOAuth && (
            <Button onClick={handleConnect} disabled={connecting} className="w-full sm:w-auto">
              <Link className="mr-2 h-4 w-4" />
              {connecting ? "Redirigiendo a Mercado Pago..." : "Conectar cuenta de Mercado Pago"}
            </Button>
          )}

          {!loading && isOAuth && (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="w-full sm:w-auto text-destructive hover:text-destructive"
            >
              <Unlink className="mr-2 h-4 w-4" />
              {disconnecting ? "Desconectando..." : "Desconectar cuenta"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>1. Hacé clic en <strong className="text-foreground">Conectar cuenta</strong>.</p>
          <p>2. Iniciá sesión con el usuario y contraseña de Mercado Pago.</p>
          <p>3. Aceptá los permisos. Eso es todo.</p>
          <p className="pt-1">Los pagos se acreditarán directamente en la cuenta conectada.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MercadoPago;
