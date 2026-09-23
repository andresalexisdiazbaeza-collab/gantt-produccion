"""Anchored optimized Gantt and clearing production start dates."""
from __future__ import annotations

import os
import tempfile
import unittest
from datetime import date

_tmp = tempfile.NamedTemporaryFile(prefix="gantt-anchor-", suffix=".db", delete=False)
os.environ["GANTT_DB_PATH"] = _tmp.name
os.environ.pop("DATABASE_URL", None)

from fastapi import HTTPException  # noqa: E402

from app.calculations import calc_finish_date  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import ItemStatus, MachineConfig, ProductionItem, User  # noqa: E402
from app.optimizer import SchedulableItem, optimize_machine_sequence  # noqa: E402
from app.optimize_service import apply_optimized_schedule, build_optimization_preview  # noqa: E402
from app.routers.items import clear_start_dates, update_item  # noqa: E402
from app.schemas import ItemUpdate  # noqa: E402


def _sched(**kwargs) -> SchedulableItem:
    data = dict(
        id=1,
        order_number="1",
        customer="Cliente",
        titulo="Red",
        color="Azul",
        matriz_mm=10.0,
        machine_id=1,
        machine_name="1",
        shifts_per_day=1,
        changeover_shifts=0,
        mts_per_shift=100.0,
        working_days=1.0,
        delivery_date=None,
        start_date=None,
    )
    data.update(kwargs)
    return SchedulableItem(**data)


def _overlaps(start_a: date, finish_a: date, start_b: date, finish_b: date) -> bool:
    return start_a < finish_b and finish_a > start_b


class OptimizerAnchorTests(unittest.TestCase):
    def test_undated_orders_still_start_at_the_anchor(self):
        anchor = date(2026, 10, 5)
        urgent = _sched(id=1, order_number="B", delivery_date=date(2026, 10, 8))
        later = _sched(id=2, order_number="A", delivery_date=date(2026, 10, 30))
        slots = optimize_machine_sequence([later, urgent], anchor)

        self.assertEqual(slots[0].start_date, anchor)
        self.assertEqual(slots[0].item.id, urgent.id)
        self.assertTrue(all(not slot.locked for slot in slots))
        self.assertEqual([slot.sequence for slot in slots], [1, 2])

    def test_dated_orders_stay_fixed_and_plan_begins_there(self):
        dated = _sched(
            id=1,
            order_number="A",
            start_date=date(2026, 10, 12),
            working_days=1,
            delivery_date=date(2026, 10, 30),
        )
        urgent = _sched(
            id=2,
            order_number="B",
            start_date=None,
            working_days=1,
            delivery_date=date(2026, 10, 6),
        )
        slots = optimize_machine_sequence([urgent, dated], date(2026, 10, 5))
        by_id = {slot.item.id: slot for slot in slots}

        self.assertTrue(by_id[1].locked)
        self.assertEqual(by_id[1].start_date, date(2026, 10, 12))
        self.assertFalse(by_id[2].locked)
        self.assertGreaterEqual(by_id[2].start_date, by_id[1].start_date)
        self.assertFalse(_overlaps(
            by_id[2].start_date, by_id[2].finish_date,
            by_id[1].start_date, by_id[1].finish_date,
        ))
        self.assertEqual(by_id[2].start_date, by_id[1].finish_date)
        self.assertEqual(slots[0].item.id, dated.id)

    def test_undated_order_fills_gap_between_anchors(self):
        first = _sched(id=1, order_number="A", start_date=date(2026, 10, 5), working_days=1)
        second = _sched(id=2, order_number="B", start_date=date(2026, 10, 20), working_days=1)
        free = _sched(id=3, order_number="C", working_days=1, delivery_date=date(2026, 10, 8))
        slots = optimize_machine_sequence([free, second, first], date(2026, 10, 1))
        by_id = {slot.item.id: slot for slot in slots}

        self.assertEqual(by_id[1].start_date, date(2026, 10, 5))
        self.assertEqual(by_id[2].start_date, date(2026, 10, 20))
        self.assertTrue(by_id[1].locked and by_id[2].locked)
        self.assertFalse(by_id[3].locked)
        self.assertGreaterEqual(by_id[3].start_date, by_id[1].finish_date)
        self.assertLessEqual(by_id[3].finish_date, by_id[2].start_date)
        self.assertEqual([slot.item.order_number for slot in slots], ["A", "C", "B"])

    def test_job_that_does_not_fit_is_scheduled_after_the_last_anchor(self):
        first = _sched(id=1, order_number="A", start_date=date(2026, 10, 5), working_days=1)
        second = _sched(id=2, order_number="B", start_date=date(2026, 10, 6), working_days=1)
        free = _sched(id=3, order_number="C", working_days=3)
        slots = optimize_machine_sequence([free, first, second], date(2026, 10, 1))
        by_id = {slot.item.id: slot for slot in slots}

        self.assertEqual(by_id[1].start_date, date(2026, 10, 5))
        self.assertEqual(by_id[2].start_date, date(2026, 10, 6))
        self.assertGreaterEqual(by_id[3].start_date, by_id[2].finish_date)
        for locked in (by_id[1], by_id[2]):
            self.assertFalse(_overlaps(
                by_id[3].start_date, by_id[3].finish_date,
                locked.start_date, locked.finish_date,
            ))

    def test_changeover_does_not_push_into_a_fixed_order(self):
        first = _sched(
            id=1, order_number="A", start_date=date(2026, 10, 5),
            working_days=1, titulo="NET", changeover_shifts=1,
        )
        second = _sched(
            id=2, order_number="B", start_date=date(2026, 10, 8),
            working_days=1, titulo="NET", changeover_shifts=1,
        )
        free = _sched(
            id=3, order_number="C", working_days=1, titulo="OTHER", changeover_shifts=1,
        )
        slots = optimize_machine_sequence([free, first, second], date(2026, 10, 1))
        by_id = {slot.item.id: slot for slot in slots}

        self.assertEqual(by_id[1].start_date, date(2026, 10, 5))
        self.assertEqual(by_id[2].start_date, date(2026, 10, 8))
        self.assertGreaterEqual(by_id[3].start_date, by_id[2].finish_date)

    def test_every_dated_order_keeps_its_date_when_nothing_is_free(self):
        early = _sched(id=1, order_number="B", start_date=date(2026, 10, 5), delivery_date=date(2026, 11, 1))
        late = _sched(id=2, order_number="A", start_date=date(2026, 10, 12), delivery_date=date(2026, 10, 6))
        slots = optimize_machine_sequence([late, early], date(2026, 10, 1))
        by_id = {slot.item.id: slot for slot in slots}
        self.assertEqual(by_id[1].start_date, date(2026, 10, 5))
        self.assertEqual(by_id[2].start_date, date(2026, 10, 12))
        self.assertTrue(all(slot.locked for slot in slots))


class ClearDatesAndApplyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def setUp(self):
        self.db = SessionLocal()
        self.admin = User(
            username="admin-test",
            password_hash="x",
            role="admin",
            display_name="Admin",
            email="admin-test@gantt.local",
        )
        self.sales = User(
            username="sales-test",
            password_hash="x",
            role="sales",
            display_name="Sales",
            email="sales-test@gantt.local",
        )
        self.machine = MachineConfig(name="T-1", mts_per_shift=100, shifts_per_day=1, changeover_shifts=0, active=True)
        self.db.add_all([self.admin, self.sales, self.machine])
        self.db.commit()
        self.db.refresh(self.machine)

    def tearDown(self):
        self.db.query(ProductionItem).delete()
        self.db.query(MachineConfig).delete()
        self.db.query(User).delete()
        self.db.commit()
        self.db.close()

    def _item(self, order_number: str, *, start: date | None, delivery: date | None = None, status: str = ItemStatus.ACTIVA.value) -> ProductionItem:
        item = ProductionItem(
            fingerprint=f"fp-{order_number}-{status}",
            status=status,
            order_number=order_number,
            customer="Cliente",
            raw_material="PP",
            titulo="Red",
            color="Azul",
            pieces=1,
            piece_length=100,
            machine_id=self.machine.id,
            start_date=start,
            delivery_date=delivery,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def test_preview_and_apply_keep_manual_start_dates(self):
        manual = date(2026, 10, 12)
        dated = self._item("A-1", start=manual, delivery=date(2026, 10, 30))
        free = self._item("B-1", start=None, delivery=date(2026, 10, 6))

        preview = build_optimization_preview(self.db)
        slots = preview["optimized_machines"][0]["items"]
        by_order = {slot["order_number"]: slot for slot in slots}
        self.assertTrue(by_order["A-1"]["locked"])
        self.assertEqual(by_order["A-1"]["start_date"], manual.isoformat())
        self.assertFalse(by_order["B-1"]["locked"])
        self.assertGreaterEqual(by_order["B-1"]["start_date"], by_order["A-1"]["finish_date"])
        self.assertTrue(any("se mantienen fijas" in warning for warning in preview["warnings"]))

        apply_optimized_schedule(self.db)
        self.db.refresh(dated)
        self.db.refresh(free)
        self.assertEqual(dated.start_date, manual)
        expected_free = calc_finish_date(manual, 1)
        self.assertEqual(free.start_date, expected_free)
        self.assertIsNotNone(free.finish_date)

    def test_clear_one_order_and_clear_all_dates(self):
        first = self._item("A-2", start=date(2026, 10, 5))
        second = self._item("B-2", start=date(2026, 10, 12))
        done = self._item("C-2", start=date(2026, 10, 7), status=ItemStatus.TERMINADA.value)

        updated = update_item(first.id, ItemUpdate(start_date=None), self.db, self.admin)
        self.assertIsNone(updated["start_date"])
        self.assertIsNone(updated["finish_date"])
        self.db.refresh(second)
        self.assertEqual(second.start_date, date(2026, 10, 12))

        result = clear_start_dates(status="activa", db=self.db, user=self.admin)
        self.assertEqual(result["cleared_count"], 1)
        self.db.refresh(second)
        self.db.refresh(done)
        self.assertIsNone(second.start_date)
        self.assertIsNone(second.finish_date)
        self.assertEqual(done.start_date, date(2026, 10, 7))

        with self.assertRaises(HTTPException) as raised:
            clear_start_dates(status="activa", db=self.db, user=self.sales)
        self.assertEqual(raised.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
