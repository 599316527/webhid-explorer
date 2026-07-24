export const hex8 = (value: number) => `00${value.toString(16)}`.substr(-2).toUpperCase();
export const hex16 = (value: number) => `0000${value.toString(16)}`.substr(-4).toUpperCase();

export const hexview = (data: DataView) => {
  const u8 = new Uint8Array(data.buffer);
  return Array.from(u8).map(b => hex8(b)).join(' ');
};

export const parseHexArray = (text: string): DataView | null => {
  text = text.replace(/[^0-9a-fA-F]/g, '');
  if (text.length % 2 || text.length === 0) return null;
  const u8 = new Uint8Array(text.length / 2);
  for (let i = 0; i < text.length; i += 2)
    u8[i / 2] = parseInt(text.substr(i, 2), 16);
  return new DataView(u8.buffer);
};

export const scrollToElement = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('highlight-flash');
    setTimeout(() => el.classList.remove('highlight-flash'), 600);
  }
};
