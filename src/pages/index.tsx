import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function IndexRedirect(): null {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/cashier");
  }, [navigate]); // add dependency for correctness

  return null;
}
