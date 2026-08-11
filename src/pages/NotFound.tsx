import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SparkLogo } from "@/components/SparkLogo";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <SparkLogo size={28} className="mx-auto text-foreground" />
        <h1 className="text-[96px] font-extrabold leading-none tracking-tighter text-muted-foreground/25">
          404
        </h1>
        <div className="space-y-2">
          <p className="text-[18px] font-semibold text-foreground">
            Sayfa bulunamadi
          </p>
          <p className="text-[13px] text-muted-foreground max-w-sm mx-auto">
            Aradiginiz sayfa mevcut degil veya tasinmis olabilir.
          </p>
        </div>
        <Button asChild variant="default" size="sm">
          <a href="/">Ana Sayfaya Don</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
