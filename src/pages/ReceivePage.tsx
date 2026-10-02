import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import jsQR from "jsqr";
import { PageContainer } from "../components/PageHeader";
import { StatusMessage } from "../components/StatusMessage";
import { ScanLine, ArrowRight, ShieldCheck, X, RefreshCw } from "lucide-react";

export function ReceivePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const verifyTokenOrOtp = async (payload: { token?: string; otp?: string }) => {
    setError("");
    setIsPending(true);
    try {
      const res = await fetch("/api/sessions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "That code is not active. Check it and try again.");
      }

      const session = await res.json();
      sessionStorage.setItem("sharefast-active-session", JSON.stringify(session));
      stopCamera();
      // Route to LifeDrop receive if this is a LifeDrop session
      if (session.lifedrop) {
        navigate(`/lifedrop/receive/${session.sessionId}`);
      } else {
        navigate(`/receive/${session.sessionId}`);
      }
    } catch (err: any) {
      setError(err.message || "That code is not active. Check it and try again.");
    } finally {
      setIsPending(false);
    }
  };

  const startCamera = async () => {
    setError("");
    setCameraActive(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const scan = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
          const codeResult = imageData ? jsQR(imageData.data, imageData.width, imageData.height) : null;

          if (codeResult?.data) {
            try {
              const url = new URL(codeResult.data, window.location.href);
              const token = url.searchParams.get("token");
              if (token) {
                verifyTokenOrOtp({ token });
                return;
              }
            } catch {
              setError("The QR code is not a ShareFast pairing link.");
            }
          }
        }
        animFrameRef.current = window.requestAnimationFrame(scan);
      };

      animFrameRef.current = window.requestAnimationFrame(scan);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Camera access was not available.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) window.cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      verifyTokenOrOtp({ token });
    }
    return () => {
      stopCamera();
    };
  }, []);

  const handlePairWithCode = () => {
    if (/^\d{6}$/.test(code)) {
      verifyTokenOrOtp({ otp: code });
    }
  };

  return (
    <PageContainer
      eyebrow="01 / Receive"
      title={
        <>
          Bring it
          <br />
          <em>this way.</em>
        </>
      }
      description="Scan the sender’s code with your camera, or enter the one-time code below."
    >
      <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        {/* Left Column: QR Scanner Card */}
        <div className="sf-rise sf-rise-1 overflow-hidden rounded-[1.6rem] bg-primary p-5 text-background sm:p-7">
          {cameraActive ? (
            <div className="relative min-h-[300px] overflow-hidden rounded-xl bg-[#161412]">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover opacity-70"
                data-testid="video-qr-scanner"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="sf-scan-line absolute left-[12%] right-[12%] top-[14%] h-0.5 bg-accent shadow-[0_0_18px_hsl(var(--accent))]" />
              <div className="absolute inset-[17%] rounded-2xl border-2 border-accent/90" />
              <div className="absolute inset-x-0 bottom-5 flex justify-center">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-lg bg-background/90 px-4 py-2 text-xs font-bold text-primary"
                  data-testid="button-close-scanner"
                >
                  Close scanner
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              className="sf-grid flex min-h-[300px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-background/25 px-6 text-center hover:bg-background/5"
              data-testid="button-open-scanner"
            >
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <ScanLine size={29} />
              </span>
              <span className="mt-5 text-lg font-bold">Open camera scanner</span>
              <span className="mt-1 max-w-xs text-sm text-background/55">
                Point this device at the QR code on the sender’s screen.
              </span>
            </button>
          )}

          {error && cameraActive && (
            <div className="mt-3">
              <StatusMessage tone="error">
                <X size={14} className="mt-0.5 shrink-0" />
                {error}
              </StatusMessage>
            </div>
          )}
        </div>

        {/* Right Column: Code input Card */}
        <div className="sf-rise sf-rise-2 flex flex-col justify-center rounded-[1.6rem] border border-border bg-card p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Or use a code
          </div>

          <label htmlFor="pairing-code" className="text-sm font-bold text-primary">
            Six-digit one-time code
          </label>

          <input
            id="pairing-code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && handlePairWithCode()}
            placeholder="000 000"
            className="mt-3 h-16 w-full rounded-xl border border-input bg-background px-4 font-mono-ui text-3xl tracking-[.22em] text-primary placeholder:text-muted-foreground/30 focus:border-accent focus:outline-none"
            data-testid="input-pairing-code"
          />

          {error && !cameraActive && (
            <div className="mt-4">
              <StatusMessage tone="error">
                <X size={14} className="mt-0.5 shrink-0" />
                {error}
              </StatusMessage>
            </div>
          )}

          <button
            type="button"
            disabled={code.length !== 6 || isPending}
            onClick={handlePairWithCode}
            className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
            data-testid="button-verify-code"
          >
            {isPending ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Checking code
              </>
            ) : (
              <>
                Pair this device <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-accent" />
            Pairing only reveals the file name and size. You decide when to save it.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
