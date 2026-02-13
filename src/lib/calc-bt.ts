import { clampNumber } from "./format";

export type BTInputs = {
  balance: number;
  aprCurrent: number;
  payment: number;
  feePct: number; // default 3
  promoMonths: number; // 12/15/18/21
};
export type BTOutputs = {
  monthlyRate: number;
  remainingAfterPromo: number;
  avgBalance: number;
  interestEstimate: number;
  feeAmount: number;
  savingsEstimate: number;
};

export function calcBalanceTransfer(inputs: BTInputs): BTOutputs {
  const balance = clampNumber(inputs.balance, 0, 1e9);
  const aprCurrent = clampNumber(inputs.aprCurrent, 0, 60);
  const payment = clampNumber(inputs.payment, 0, 1e9);
  const feePct = clampNumber(inputs.feePct, 0, 10);
  const promoMonths = clampNumber(inputs.promoMonths, 1, 36);

  const monthlyRate = aprCurrent / 100 / 12;

  const remainingAfterPromo = Math.max(0, balance - payment * promoMonths);
  const avgBalance = (balance + remainingAfterPromo) / 2;
  const interestEstimate = avgBalance * monthlyRate * promoMonths;

  const feeAmount = balance * (feePct / 100);
  const savingsEstimate = interestEstimate - feeAmount;

  return { monthlyRate, remainingAfterPromo, avgBalance, interestEstimate, feeAmount, savingsEstimate };
}
