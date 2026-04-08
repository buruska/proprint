export const MIN_PASSWORD_LENGTH = 8;

const passwordRules = [
  {
    id: "length",
    label: `Legalabb ${MIN_PASSWORD_LENGTH} karakter`,
    test: (value: string) => value.length >= MIN_PASSWORD_LENGTH,
  },
  {
    id: "lowercase",
    label: "Tartalmazzon kisbetut",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "uppercase",
    label: "Tartalmazzon nagybetut",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "number",
    label: "Tartalmazzon szamot",
    test: (value: string) => /\d/.test(value),
  },
  {
    id: "special",
    label: "Tartalmazzon specialis karaktert",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

export function getPasswordCriteria(password: string) {
  return passwordRules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(password),
  }));
}

export function isPasswordStrong(password: string) {
  return getPasswordCriteria(password).every((rule) => rule.met);
}
