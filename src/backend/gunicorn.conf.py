import os


def positive_integer(name, default):
    raw_value = os.getenv(name, str(default))
    try:
        value = int(raw_value)
    except ValueError as error:
        raise RuntimeError(f"{name} must be a positive integer") from error
    if value < 1:
        raise RuntimeError(f"{name} must be a positive integer")
    return value


bind = f"0.0.0.0:{positive_integer('PORT', 8000)}"
workers = positive_integer("WEB_CONCURRENCY", 2)
timeout = positive_integer("GUNICORN_TIMEOUT", 30)
graceful_timeout = positive_integer("GUNICORN_GRACEFUL_TIMEOUT", 30)
keepalive = positive_integer("GUNICORN_KEEPALIVE", 5)
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")
accesslog = None
errorlog = "-"
capture_output = True
daemon = False
control_socket_disable = True
forwarded_allow_ips = os.getenv("FORWARDED_ALLOW_IPS", "127.0.0.1")
