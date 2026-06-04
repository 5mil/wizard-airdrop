/**
 * airdrop.js — SPL utility mint creation + holder airdrop transfers
 *
 * Security:
 *  - Private keys never leave the wallet extension
 *  - Transactions are constructed here, then passed to provider.signTransaction()
 *  - No external calls except to the configured Helius RPC endpoint
 */
import { APP } from './state.js';
import { $, log, showInfo, trunc } from './ui.js';
import { getConnection, getRpcUrl, getNet, lamportsToSol } from './helius.js';

const TOKEN_PROGRAM_ID         = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const SYSVAR_RENT_PUBKEY       = 'SysvarRent111111111111111111111111111111111';
const SYSTEM_PROGRAM_ID        = '11111111111111111111111111111111';

const { PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair } = window.solanaWeb3;

// ── u64 little-endian helper ─────────────────────────────────────
function u64LE(value) {
  const buf = new Uint8Array(8);
  let v = BigInt(value);
  for (let i = 0; i < 8; i++) { buf[i] = Number(v & 0xffn); v >>= 8n; }
  return buf;
}

// ── ATA address derivation ───────────────────────────────────────
async function findATA(mint, owner) {
  const [addr] = await PublicKey.findProgramAddress(
    [
      new PublicKey(owner).toBuffer(),
      new PublicKey(TOKEN_PROGRAM_ID).toBuffer(),
      new PublicKey(mint).toBuffer(),
    ],
    new PublicKey(ASSOCIATED_TOKEN_PROGRAM)
  );
  return addr;
}

// ── Create ATA instruction ───────────────────────────────────────
function createATAIx(payer, ata, owner, mint) {
  return new TransactionInstruction({
    keys: [
      { pubkey: new PublicKey(payer),              isSigner: true,  isWritable: true  },
      { pubkey: ata,                               isSigner: false, isWritable: true  },
      { pubkey: new PublicKey(owner),              isSigner: false, isWritable: false },
      { pubkey: new PublicKey(mint),               isSigner: false, isWritable: false },
      { pubkey: new PublicKey(SYSTEM_PROGRAM_ID),  isSigner: false, isWritable: false },
      { pubkey: new PublicKey(TOKEN_PROGRAM_ID),   isSigner: false, isWritable: false },
      { pubkey: new PublicKey(SYSVAR_RENT_PUBKEY), isSigner: false, isWritable: false },
    ],
    programId: new PublicKey(ASSOCIATED_TOKEN_PROGRAM),
    data: new Uint8Array(0),
  });
}

// ── Create utility mint ──────────────────────────────────────────
export async function createUtilityMint(onUpdate) {
  if (!APP.walletPubkey) { log('Connect wallet first.'); return; }
  if (!APP.holders.length) { log('Load and filter holders first.'); return; }

  log('Creating utility mint\u2026');
  const conn     = getConnection();
  const payer    = new PublicKey(APP.walletPubkey);
  const mintKp   = Keypair.generate();
  const mintPK   = mintKp.publicKey;
  const tokenProg = new PublicKey(TOKEN_PROGRAM_ID);

  const lamports = await conn.getMinimumBalanceForRentExemption(82);

  // InitializeMint instruction data (instruction 0)
  const initData = new Uint8Array(67);
  initData[0] = 0; initData[1] = 0; // variant + decimals = 0
  payer.toBytes().forEach((b, i) => { initData[2 + i] = b; });
  initData[34] = 0; // freeze authority: none

  const tx = new Transaction();
  tx.add(SystemProgram.createAccount({
    fromPubkey: payer,
    newAccountPubkey: mintPK,
    lamports,
    space: 82,
    programId: tokenProg,
  }));
  tx.add(new TransactionInstruction({
    keys: [
      { pubkey: mintPK,                          isSigner: false, isWritable: true  },
      { pubkey: new PublicKey(SYSVAR_RENT_PUBKEY), isSigner: false, isWritable: false },
    ],
    programId: tokenProg,
    data: initData,
  }));

  tx.feePayer = payer;
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  tx.partialSign(mintKp);

  const signed = await APP.provider.signTransaction(tx);
  const sig    = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(sig, 'finalized');

  APP.utilityMint = mintPK.toBase58();

  const explorer = `https://solscan.io/tx/${sig}${getNet() === 'devnet' ? '?cluster=devnet' : ''}`;
  const umd = $('utilityMintDisplay');
  if (umd) umd.innerHTML = `<code>${APP.utilityMint}</code><br><small>tx: <a href="${explorer}" target="_blank">${trunc(sig)}</a></small>`;
  log(`Utility mint created: ${APP.utilityMint}  tx: ${sig}`);
  if (typeof onUpdate === 'function') onUpdate();
}

// ── Airdrop to selected holders ──────────────────────────────────
export async function runAirdrop(onUpdate) {
  if (!APP.walletPubkey || !APP.holders.length || !APP.utilityMint) return;

  const perHolder = BigInt($('amtInput').value);
  if (perHolder <= 0n) { log('Set amount > 0.'); return; }

  const conn     = getConnection();
  const payer    = new PublicKey(APP.walletPubkey);
  const mintPK   = new PublicKey(APP.utilityMint);
  const tokenProg = new PublicKey(TOKEN_PROGRAM_ID);
  const total    = perHolder * BigInt(APP.holders.length);

  log(`Airdrop start \u2014 ${APP.holders.length} holders \u00b7 ${perHolder}/each \u00b7 ${total} total`);

  // Ensure payer ATA exists
  const payerATA = await findATA(APP.utilityMint, APP.walletPubkey);
  if (!await conn.getAccountInfo(payerATA)) {
    log('Creating payer ATA\u2026');
    const tx = new Transaction();
    tx.add(createATAIx(APP.walletPubkey, payerATA, APP.walletPubkey, APP.utilityMint));
    tx.feePayer = payer;
    tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
    const s   = await APP.provider.signTransaction(tx);
    const sig = await conn.sendRawTransaction(s.serialize());
    await conn.confirmTransaction(sig, 'confirmed');
    log(`Payer ATA created: ${payerATA.toBase58()}  tx: ${sig}`);
  }

  // Mint total supply to payer ATA
  const mintToData = new Uint8Array(9); mintToData[0] = 7;
  u64LE(total).forEach((b, i) => { mintToData[1 + i] = b; });
  const mtt = new Transaction();
  mtt.add(new TransactionInstruction({
    keys: [
      { pubkey: mintPK,    isSigner: false, isWritable: true  },
      { pubkey: payerATA,  isSigner: false, isWritable: true  },
      { pubkey: payer,     isSigner: true,  isWritable: false },
    ],
    programId: tokenProg,
    data: mintToData,
  }));
  mtt.feePayer = payer;
  mtt.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  const sm      = await APP.provider.signTransaction(mtt);
  const mintSig = await conn.sendRawTransaction(sm.serialize());
  await conn.confirmTransaction(mintSig, 'confirmed');
  log(`Minted ${total} to payer ATA \u2014 tx: ${mintSig}`);

  // Transfer to each holder
  let ok = 0, fail = 0;
  for (let i = 0; i < APP.holders.length; i++) {
    const { owner } = APP.holders[i];
    try {
      if (i > 0) await new Promise(r => setTimeout(r, 500));
      const destATA = await findATA(APP.utilityMint, owner);
      const tx = new Transaction();
      if (!await conn.getAccountInfo(destATA))
        tx.add(createATAIx(APP.walletPubkey, destATA, owner, APP.utilityMint));
      const td = new Uint8Array(9); td[0] = 3;
      u64LE(perHolder).forEach((b, j) => { td[1 + j] = b; });
      tx.add(new TransactionInstruction({
        keys: [
          { pubkey: payerATA, isSigner: false, isWritable: true  },
          { pubkey: destATA,  isSigner: false, isWritable: true  },
          { pubkey: payer,    isSigner: true,  isWritable: false },
        ],
        programId: tokenProg,
        data: td,
      }));
      tx.feePayer = payer;
      tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
      const s   = await APP.provider.signTransaction(tx);
      const sig = await conn.sendRawTransaction(s.serialize());
      await conn.confirmTransaction(sig, 'confirmed');
      ok++;
      log(`\u2713 [${i + 1}/${APP.holders.length}] ${trunc(owner)}  tx: ${sig}`);
    } catch (e) {
      fail++;
      log(`\u2717 [${i + 1}/${APP.holders.length}] ${trunc(owner)}  ${e.message || e}`);
    }
  }

  const summary = `Airdrop complete \u2014 ${ok} succeeded, ${fail} failed.`;
  log(summary);
  showInfo($('airdropInfo'), `<strong>${summary}</strong>`);
  if (typeof onUpdate === 'function') onUpdate();
}
