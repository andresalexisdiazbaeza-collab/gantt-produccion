from __future__ import annotations

from typing import Any

SUPPORTED_LANGS = ("es", "en", "sk", "it")

_STRINGS: dict[str, dict[str, str]] = {
    "es": {
        "app_title": "Gantt Producción",
        "gantt_chart_title": "Diagrama Gantt",
        "gantt_calendar": "Calendario de producción",
        "gantt_legend": "Barras azules = a tiempo · Barras rojas = atrasadas vs fecha ofrecida",
        "gantt_plan_title": "Plan Gantt",
        "gantt_generated": "Generado",
        "gantt_scheduled_orders": "órdenes programadas",
        "gantt_no_schedule": "No hay órdenes con máquina, fecha inicio y fecha fin asignadas.",
        "machine": "Máquina",
        "order": "Orden",
        "customer": "Cliente",
        "material": "Material",
        "start": "Inicio",
        "finish": "Fin",
        "days": "Días",
        "delivery": "Entrega",
        "compliance": "Cumplimiento",
        "kg": "Kg",
        "status": "Estado",
        "unassigned": "Sin asignar",
        "machine_section": "Máquina {name}",
        "machine_orders": "{count} órdenes",
        "legend_title": "Leyenda",
        "legend_on_time": "Azul = a tiempo",
        "legend_late": "Rojo = atrasada vs fecha ofrecida",
        "active_orders_gantt": "Órdenes activas + Gantt",
        "records": "Registros",
        "scheduled": "Programadas",
        "delivery_compliance": "Cumplimiento de entregas",
        "on_time": "A tiempo",
        "late": "Atrasadas",
        "no_date": "Sin fecha",
        "pending_finish": "Sin fin",
        "more_in_excel": "... y {count} registros más en Excel",
        "sheet_gantt": "Gantt",
        "sheet_summary": "Resumen Gantt",
        "sheet_orders": "Órdenes",
        "summary_by_machine": "Resumen por máquina",
        "total_orders": "Total órdenes",
        "late_orders": "Atrasadas",
        "working_days": "Días hábiles",
        "late_days": "Atrasada +{days} d",
        "on_time_margin": "A tiempo (−{days} d)",
        "on_time_plain": "A tiempo",
        "no_delivery_date": "Sin fecha entrega",
        "no_finish_date": "Sin fecha fin",
    },
    "en": {
        "app_title": "Production Gantt",
        "gantt_chart_title": "Gantt Chart",
        "gantt_calendar": "Production calendar",
        "gantt_legend": "Blue bars = on time · Red bars = late vs offered date",
        "gantt_plan_title": "Gantt Plan",
        "gantt_generated": "Generated",
        "gantt_scheduled_orders": "scheduled orders",
        "gantt_no_schedule": "No orders with machine, start date and finish date assigned.",
        "machine": "Machine",
        "order": "Order",
        "customer": "Customer",
        "material": "Material",
        "start": "Start",
        "finish": "Finish",
        "days": "Days",
        "delivery": "Delivery",
        "compliance": "Compliance",
        "kg": "Kg",
        "status": "Status",
        "unassigned": "Unassigned",
        "machine_section": "Machine {name}",
        "machine_orders": "{count} orders",
        "legend_title": "Legend",
        "legend_on_time": "Blue = on time",
        "legend_late": "Red = late vs offered date",
        "active_orders_gantt": "Active orders + Gantt",
        "records": "Records",
        "scheduled": "Scheduled",
        "delivery_compliance": "Delivery compliance",
        "on_time": "On time",
        "late": "Late",
        "no_date": "No date",
        "pending_finish": "No finish",
        "more_in_excel": "... and {count} more records in Excel",
        "sheet_gantt": "Gantt",
        "sheet_summary": "Gantt summary",
        "sheet_orders": "Orders",
        "summary_by_machine": "Summary by machine",
        "total_orders": "Total orders",
        "late_orders": "Late",
        "working_days": "Working days",
        "late_days": "Late +{days} d",
        "on_time_margin": "On time (−{days} d)",
        "on_time_plain": "On time",
        "no_delivery_date": "No delivery date",
        "no_finish_date": "No finish date",
    },
    "sk": {
        "app_title": "Gantt Výroba",
        "gantt_chart_title": "Gantt diagram",
        "gantt_calendar": "Výrobný kalendár",
        "gantt_legend": "Modré pruhy = včas · Červené pruhy = mešká oproti ponúkanému termínu",
        "gantt_plan_title": "Plán Gantt",
        "gantt_generated": "Vygenerované",
        "gantt_scheduled_orders": "naplánovaných objednávok",
        "gantt_no_schedule": "Žiadne objednávky so strojom, dátumom začiatku a ukončenia.",
        "machine": "Stroj",
        "order": "Objednávka",
        "customer": "Zákazník",
        "material": "Materiál",
        "start": "Začiatok",
        "finish": "Koniec",
        "days": "Dni",
        "delivery": "Dodávka",
        "compliance": "Plnenie",
        "kg": "Kg",
        "status": "Stav",
        "unassigned": "Nepriradené",
        "machine_section": "Stroj {name}",
        "machine_orders": "{count} objednávok",
        "legend_title": "Legenda",
        "legend_on_time": "Modrá = včas",
        "legend_late": "Červená = mešká oproti termínu",
        "active_orders_gantt": "Aktívne objednávky + Gantt",
        "records": "Záznamy",
        "scheduled": "Naplánované",
        "delivery_compliance": "Plnenie dodávok",
        "on_time": "Včas",
        "late": "Mešká",
        "no_date": "Bez dátumu",
        "pending_finish": "Bez ukončenia",
        "more_in_excel": "... a ďalších {count} záznamov v Exceli",
        "sheet_gantt": "Gantt",
        "sheet_summary": "Prehľad Gantt",
        "sheet_orders": "Objednávky",
        "summary_by_machine": "Prehľad podľa stroja",
        "total_orders": "Celkom objednávok",
        "late_orders": "Meškajúce",
        "working_days": "Pracovné dni",
        "late_days": "Mešká +{days} d",
        "on_time_margin": "Včas (−{days} d)",
        "on_time_plain": "Včas",
        "no_delivery_date": "Bez dátumu dodávky",
        "no_finish_date": "Bez dátumu ukončenia",
    },
    "it": {
        "app_title": "Gantt Produzione",
        "gantt_chart_title": "Diagramma Gantt",
        "gantt_calendar": "Calendario di produzione",
        "gantt_legend": "Barre blu = in tempo · Barre rosse = in ritardo vs data offerta",
        "gantt_plan_title": "Piano Gantt",
        "gantt_generated": "Generato",
        "gantt_scheduled_orders": "ordini programmati",
        "gantt_no_schedule": "Nessun ordine con macchina, data inizio e data fine assegnate.",
        "machine": "Macchina",
        "order": "Ordine",
        "customer": "Cliente",
        "material": "Materiale",
        "start": "Inizio",
        "finish": "Fine",
        "days": "Giorni",
        "delivery": "Consegna",
        "compliance": "Rispetto scadenza",
        "kg": "Kg",
        "status": "Stato",
        "unassigned": "Non assegnato",
        "machine_section": "Macchina {name}",
        "machine_orders": "{count} ordini",
        "legend_title": "Legenda",
        "legend_on_time": "Blu = in tempo",
        "legend_late": "Rosso = in ritardo vs data offerta",
        "active_orders_gantt": "Ordini attivi + Gantt",
        "records": "Record",
        "scheduled": "Programmati",
        "delivery_compliance": "Rispetto consegne",
        "on_time": "In tempo",
        "late": "In ritardo",
        "no_date": "Senza data",
        "pending_finish": "Senza fine",
        "more_in_excel": "... e altri {count} record in Excel",
        "sheet_gantt": "Gantt",
        "sheet_summary": "Riepilogo Gantt",
        "sheet_orders": "Ordini",
        "summary_by_machine": "Riepilogo per macchina",
        "total_orders": "Ordini totali",
        "late_orders": "In ritardo",
        "working_days": "Giorni lavorativi",
        "late_days": "In ritardo +{days} g",
        "on_time_margin": "In tempo (−{days} g)",
        "on_time_plain": "In tempo",
        "no_delivery_date": "Senza data consegna",
        "no_finish_date": "Senza data fine",
    },
}


def normalize_lang(lang: str | None) -> str:
    if not lang:
        return "es"
    code = lang.strip().lower()[:2]
    return code if code in SUPPORTED_LANGS else "es"


class ExportTranslator:
    def __init__(self, lang: str | None = None):
        self.lang = normalize_lang(lang)
        self._strings = _STRINGS[self.lang]

    def t(self, key: str, **kwargs: Any) -> str:
        text = self._strings.get(key) or _STRINGS["es"].get(key, key)
        if kwargs:
            return text.format(**kwargs)
        return text

    def compliance_label(self, item: dict) -> str:
        status = item.get("delivery_status")
        if status == "late" or item.get("is_late"):
            return self.t("late_days", days=item.get("days_late") or 0)
        if status == "on_time":
            margin = item.get("days_margin") or 0
            return self.t("on_time_margin", days=margin) if margin else self.t("on_time_plain")
        if status == "no_date":
            return self.t("no_delivery_date")
        if status == "pending":
            return self.t("no_finish_date")
        return ""


def get_export_translator(lang: str | None = None) -> ExportTranslator:
    return ExportTranslator(lang)
