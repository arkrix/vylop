import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageLoader from "../../components/common/PageLoader";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const googleUsername = searchParams.get("googleUsername");

    const completeOAuthSession = async () => {
      // Intentional delay to showcase the transition loader
      await new Promise(resolve => setTimeout(resolve, 1400));

      if (googleUsername) {
        localStorage.setItem("username", googleUsername);
        localStorage.setItem("loginType", "google");
        
        const redirectUrl = localStorage.getItem("redirectUrl") || "/";
        localStorage.removeItem("redirectUrl");

        navigate(redirectUrl, { replace: true });
      } else {
        navigate("/auth", { replace: true });
      }
    };

    completeOAuthSession();
  }, [searchParams, navigate]);

  return (
    <PageLoader 
      message="Finalizing Google Authentication..." 
      subtext="Exchanging cryptographic tokens and initializing your workspace profile..." 
    />
  );
};

export default AuthCallback;