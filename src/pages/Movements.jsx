import CashShiftsSlider from '@/components/reports/CashShiftsSlider';
import PaymentsTableServer from '@/components/reports/PaymentsTableServer';

export default function Movements() {
  return (
    <div className="space-y-4">
      <CashShiftsSlider title="Resumen de turnos (caja)" />
      <PaymentsTableServer initialPage={1} pageSize={20} />
    </div>
  );
}
