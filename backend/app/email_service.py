from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)

APP_URL = os.environ.get("GANTT_APP_URL", "http://localhost:5173").rstrip("/")


def smtp_configured() -> bool:
    return bool(os.environ.get("GANTT_SMTP_HOST"))


def send_password_reset_email(*, to_email: str, username: str, reset_url: str) -> None:
    subject = "Gantt Producción — recuperar contraseña"
    body = (
        f"Hola {username},\n\n"
        f"Recibimos una solicitud para restablecer tu contraseña.\n\n"
        f"Abre este enlace (válido 1 hora):\n{reset_url}\n\n"
        f"Si no solicitaste este cambio, ignora este mensaje.\n"
    )

    if not smtp_configured():
        logger.warning(
            "SMTP no configurado — enlace de recuperación para %s (%s): %s",
            username,
            to_email,
            reset_url,
        )
        return

    host = os.environ["GANTT_SMTP_HOST"]
    port = int(os.environ.get("GANTT_SMTP_PORT", "587"))
    user = os.environ.get("GANTT_SMTP_USER", "")
    password = os.environ.get("GANTT_SMTP_PASSWORD", "")
    from_addr = os.environ.get("GANTT_SMTP_FROM", user or "noreply@gantt.local")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.set_content(body)

    with smtplib.SMTP(host, port, timeout=30) as server:
        if os.environ.get("GANTT_SMTP_TLS", "true").lower() != "false":
            server.starttls()
        if user and password:
            server.login(user, password)
        server.send_message(msg)

    logger.info("Correo de recuperación enviado a %s", to_email)
