import PaymentsTableServer from '@/components/reports/PaymentsTableServer';

export default function Movements(){
  return (
    <div className="space-y-4">
      <PaymentsTableServer initialPage={1} pageSize={20} />
    </div>
  );
}