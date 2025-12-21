import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  return <Navigate to={`/${user?.role?.toLowerCase().replace(/\s+/g, '')}/dashboard`} replace />;
};

export default Index;
