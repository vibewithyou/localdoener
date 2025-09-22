import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export default function AuthDialog({ isOpen, onClose, defaultTab = "login" }: AuthDialogProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleSuccess = () => {
    onClose();
  };

  const switchToLogin = () => setActiveTab("login");
  const switchToRegister = () => setActiveTab("register");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 border-0 bg-transparent shadow-none">
        {activeTab === "login" ? (
          <LoginForm
            onSuccess={handleSuccess}
            onSwitchToRegister={switchToRegister}
          />
        ) : (
          <RegisterForm
            onSuccess={handleSuccess}
            onSwitchToLogin={switchToLogin}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}