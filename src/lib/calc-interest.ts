import { clampNumber } from "./format";

export type InterestInputs = { balance: number; apr: number; payment: number; };
export type InterestOutputs = {
  monthlyRate: number;
  feasible: boolean;
  minPaymentToReduce: number;
  months: number;
  totalPaid: number;
  totalInterest: number;
};

export function calcInterest(inputs: InterestInputs): InterestOutputs {
  const balance = clampNumber(inputs.balance, 0, 1e9);
  const apr = clampNumber(inputs.apr, 0, 60);
  const payment = clampNumber(inputs.payment, 0, 1e9);

  const monthlyRate = apr / 100 / 12;
  const minPaymentToReduce = balance * monthlyRate + 1;
  const feasible = payment > balance * monthlyRate && payment > 0;

  if (!feasible || balance === 0) {
    return {
      monthlyRate,
      feasible: balance === 0 ? true : false,
      minPaymentToReduce,
      months: balance === 0 ? 0 : 0,
      totalPaid: 0,
      totalInterest: 0,
    };
  }

  // N = -ln(1 - r*B/P) / ln(1+r)
  const inner = 1 - (monthlyRate * balance) / payment;
  const months = Math.max(1, Math.round((-Math.log(inner)) / Math.log(1 + monthlyRate)));

  const totalPaid = months * payment;
  const totalInterest = Math.max(0, totalPaid - balance);

  return { monthlyRate, feasible, minPaymentToReduce, months, totalPaid, totalInterest };
}
