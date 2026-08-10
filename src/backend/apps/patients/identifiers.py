import re


def normalize_national_id(value):
    return re.sub(r"[\s-]+", "", value).upper()
