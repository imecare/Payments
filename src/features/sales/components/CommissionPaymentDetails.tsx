import type { Sale } from '@/shared/types';

interface Props {
  sale: Pick<Sale, 'isCommissionPaid' | 'commissionPaidAt' | 'commissionPaymentNote'>;
}

export default function CommissionPaymentDetails({ sale }: Props) {
  if (!sale.isCommissionPaid) return null;

  return (
    <div className="mt-2 small text-start">
      <div>
        <strong>Fecha de pago:</strong>{' '}
        {sale.commissionPaidAt
          ? new Date(sale.commissionPaidAt).toLocaleDateString('es-MX')
          : 'No registrada'}
      </div>
      <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        <strong>Nota de pago:</strong>{' '}
        {sale.commissionPaymentNote?.trim() || 'Sin nota registrada.'}
      </div>
    </div>
  );
}
