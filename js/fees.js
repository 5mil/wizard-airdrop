/**
 * fees.js — SOL fee estimation for the airdrop operation
 */
import { getConnection, lamportsToSol } from './helius.js';
import { $, log } from './ui.js';

export async function showFees(holderCount) {
  try {
    const conn = getConnection();
    const [rentMint, rentATA] = await Promise.all([
      conn.getMinimumBalanceForRentExemption(82),
      conn.getMinimumBalanceForRentExemption(165),
    ]);
    const TX_FEE = 5000;

    const mintCost     = rentMint + TX_FEE;
    const payerATACost = rentATA  + TX_FEE;
    const perHolder    = rentATA  + TX_FEE;
    const worstTotal   = mintCost + payerATACost + perHolder * holderCount;

    $('feeMint').textContent      = lamportsToSol(mintCost);
    $('feePayerATA').textContent  = lamportsToSol(payerATACost);
    $('feeHolderATA').textContent = lamportsToSol(perHolder);
    $('feeTx').textContent        = lamportsToSol(TX_FEE);
    $('feeTotal').textContent     = lamportsToSol(worstTotal);
    $('feePanel').style.display   = 'block';

    log(`Fee estimate (${holderCount} holders): worst-case ${lamportsToSol(worstTotal)}`);
  } catch (e) {
    log(`Fee estimate failed: ${e.message}`);
  }
}
