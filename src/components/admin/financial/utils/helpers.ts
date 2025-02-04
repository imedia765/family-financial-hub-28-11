
import { AlertCircle } from "lucide-react";

export const getPaymentStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-green-500/20 text-green-400';
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'rejected':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

export const getPaymentStatusIcon = (status: string) => {
  return <AlertCircle className="mr-1 h-4 w-4" />;
};

export const formatMemberNumber = (collector: any, index: number) => {
  return collector.members?.member_number || `M${String(index + 1).padStart(4, '0')}`;
};

export const calculatePaymentStats = (paymentsData: any[]) => {
  if (!paymentsData) return null;
  
  return {
    totalPayments: paymentsData.length,
    totalAmount: paymentsData.reduce((sum, payment) => sum + (payment.amount || 0), 0),
    pendingPayments: paymentsData.filter(p => p.status === 'pending').length,
    approvedPayments: paymentsData.filter(p => p.status === 'approved').length,
    paymentMethods: {
      cash: paymentsData.filter(p => p.payment_method === 'cash').length,
      bankTransfer: paymentsData.filter(p => p.payment_method === 'bank_transfer').length
    },
    recentPayments: paymentsData
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  };
};
