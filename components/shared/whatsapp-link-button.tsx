import { MessageCircleMore } from "lucide-react";

import { Button } from "@/components/ui/button";

type WhatsAppLinkButtonProps = {
  href: string | null;
  label: string;
  variant?: "primary" | "outline" | "secondary";
  size?: "default" | "sm";
};

export function WhatsAppLinkButton({
  href,
  label,
  variant = "outline",
  size = "default",
}: WhatsAppLinkButtonProps) {
  if (!href) {
    return (
      <Button disabled size={size} variant={variant}>
        <MessageCircleMore className="size-4" />
        {label}
      </Button>
    );
  }

  return (
    <Button asChild size={size} variant={variant}>
      <a href={href} rel="noreferrer" target="_blank">
        <MessageCircleMore className="size-4" />
        {label}
      </a>
    </Button>
  );
}
