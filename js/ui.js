/**
 * ui.js — shared DOM helpers, logging, info panels
 */

export const $ = id => document.getElementById(id);

export function log(msg) {
  const el = $('log');
  if (!el) return;
  el.textContent += `\n[${new Date().toLocaleTimeString()}] ${msg}`;
  el.scrollTop = el.scrollHeight;
}

export function showInfo(el, msg, type = '') {
  if (!el) return;
  el.style.display = 'block';
  el.className = type ? `info ${type}` : 'info';
  el.innerHTML = msg;
}

export function hideInfo(el) {
  if (!el) return;
  el.style.display = 'none';
}

export function trunc(v) {
  return v ? `${v.slice(0, 4)}\u2026${v.slice(-4)}` : '\u2014';
}

export function sol(lamports) {
  return (lamports / 1_000_000_000).toFixed(6) + ' SOL';
}

export function setPanel(id, on) {
  const el = $(id);
  if (el) el.classList.toggle('on', on);
}
