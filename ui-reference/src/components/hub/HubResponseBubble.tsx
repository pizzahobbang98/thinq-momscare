import { useEffect, useState } from "react";

type HubResponseBubbleProps = {
  message: string;
  active: boolean;
};

// Fixed bottom-center subtitle bar (screen overlay), with a typing effect.
export function HubResponseBubble({ message, active }: HubResponseBubbleProps) {
  const [typedMessage, setTypedMessage] = useState(active ? "" : message);

  useEffect(() => {
    if (!active) {
      setTypedMessage(message);
      return;
    }

    setTypedMessage("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedMessage(message.slice(0, index));
      if (index >= message.length) window.clearInterval(timer);
    }, 32);

    return () => window.clearInterval(timer);
  }, [active, message]);

  if (!message) return null;

  return (
    <div className="hub-bubble-wrap">
      <div className={active ? "hub-bubble active" : "hub-bubble"}>
        {typedMessage}
        {active && typedMessage.length < message.length && <span className="typing-caret" />}
      </div>
    </div>
  );
}
