from __future__ import annotations

from datetime import date, timedelta
from typing import Optional, Set


def _easter_sunday(year: int) -> date:
    """Anonymous Gregorian algorithm."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def slovak_holidays_for_year(year: int) -> list[tuple[date, str]]:
    easter = _easter_sunday(year)
    fixed = [
        (date(year, 1, 1), "Deň vzniku SR"),
        (date(year, 1, 6), "Zjavenie Pána"),
        (date(year, 5, 1), "Sviatok práce"),
        (date(year, 5, 8), "Deň víťazstva nad fašizmom"),
        (date(year, 7, 5), "Sviatok svätého Cyrila a Metoda"),
        (date(year, 8, 29), "Výročie SNP"),
        (date(year, 9, 1), "Deň Ústavy SR"),
        (date(year, 9, 15), "Sedembolestná Panna Mária"),
        (date(year, 11, 1), "Sviatok všetkých svätých"),
        (date(year, 11, 17), "Deň boja za slobodu a demokraciu"),
        (date(year, 12, 24), "Štedrý deň"),
        (date(year, 12, 25), "Prvý sviatok vianočný"),
        (date(year, 12, 26), "Druhý sviatok vianočný"),
    ]
    movable = [
        (easter - timedelta(days=2), "Veľký piatok"),
        (easter + timedelta(days=1), "Veľkonočný pondelok"),
    ]
    return fixed + movable


def is_weekend(d: date) -> bool:
    return d.weekday() >= 5


def add_workdays(start: date, workdays: float, extra_holidays: Optional[Set[date]] = None) -> date:
    """Excel WORKDAY equivalent: add workdays skipping weekends and SK holidays."""
    if workdays <= 0:
        return start

    holidays: Set[date] = set(extra_holidays or set())
    for y in range(start.year, start.year + 5):
        holidays.update(d for d, _ in slovak_holidays_for_year(y))

    whole_days = int(workdays)
    fraction = workdays - whole_days
    current = start
    added = 0

    while added < whole_days:
        current += timedelta(days=1)
        if not is_weekend(current) and current not in holidays:
            added += 1

    if fraction > 0:
        current += timedelta(days=1)
        while is_weekend(current) or current in holidays:
            current += timedelta(days=1)

    return current


def next_workday(d: Optional[date] = None) -> date:
    """Next business day on or after d (default today)."""
    current = d or date.today()
    holidays: Set[date] = set()
    for y in range(current.year, current.year + 2):
        holidays.update(hd for hd, _ in slovak_holidays_for_year(y))
    while is_weekend(current) or current in holidays:
        current += timedelta(days=1)
    return current
