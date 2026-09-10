from django.conf import settings


def set_refresh_cookie(response, token, max_age=None):
    cookie_max_age = settings.REFRESH_COOKIE_MAX_AGE if max_age is None else max_age
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        token,
        max_age=min(settings.REFRESH_COOKIE_MAX_AGE, max(0, int(cookie_max_age))),
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        path=settings.REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response):
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        "",
        max_age=0,
        expires="Thu, 01 Jan 1970 00:00:00 GMT",
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        path=settings.REFRESH_COOKIE_PATH,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )
