export const stripNonDigits = (input: string): string => input.replace(/\D/g, '');

export const digitsLength = (input: string): number => stripNonDigits(input).length;

// E.164: up to 15 digits in total (excluding '+'), require minimum 9 digits for validity
export const validatePhoneNumber = (phone: string): boolean => {
  const count = digitsLength(phone);
  return count >= 9 && count <= 15;
};

// Limit local number digits to ensure total (country + local) <= 15
export const limitLocalDigits = (countryDialCode: string, localDigits: string): string => {
  const countryDigits = digitsLength(countryDialCode);
  const onlyLocal = stripNonDigits(localDigits);
  const maxLocal = Math.max(0, 15 - countryDigits);
  return onlyLocal.slice(0, maxLocal);
};

export const buildE164 = (countryDialCode: string, localDigits: string): string => {
  const limited = limitLocalDigits(countryDialCode, localDigits);
  const cc = countryDialCode.startsWith('+') ? countryDialCode : `+${countryDialCode}`;
  return `${cc}${limited}`;
};
