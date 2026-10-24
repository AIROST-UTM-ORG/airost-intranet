export const getSocialUrl = (value, network) => {
  if (value.startsWith('http')) return value;
  const handle = network === 'instagram' ? value.replace(/^@/, '') : value;
  return `https://${network}.com/${handle}`;
};