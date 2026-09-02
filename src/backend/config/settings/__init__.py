import os


# Preserve the historical ``config.settings`` alias without making explicit
# profiles such as ``config.settings.test`` import development first.
if os.getenv("DJANGO_SETTINGS_MODULE") == __name__:
    from .development import *  # noqa: F401,F403
