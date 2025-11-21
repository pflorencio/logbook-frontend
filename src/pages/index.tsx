import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function IndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/cashier");
  }, []);

  return null;
}
