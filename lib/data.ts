import type { ContactMethod, ContentBlock } from "@/lib/types";

export const siteMeta = {
  name: "ProPrint Kiadó",
  strapline: "Kortárs és igényes könyvek, gondosan szerkesztve.",
  description:
    "Könyvkiadói weboldal prototípus könyvkatalógussal, emailes rendelési folyamattal és admin felülettel.",
};

export const contactMethods: ContactMethod[] = [
  {
    label: "Email",
    value: "hello@proprintkiado.hu",
    href: "mailto:hello@proprintkiado.hu",
  },
  {
    label: "Telefon",
    value: "+40 741 123 456",
    href: "tel:+40741123456",
  },
  {
    label: "Cím",
    value: "540123 Marosvásárhely, Könyv utca 8.",
  },
];

export const adminContentBlocks: ContentBlock[] = [
  {
    id: "home-hero",
    title: "Főoldal hero szekció",
    summary: "Főcím, alcím, kiemelt CTA gombok",
    status: "Published",
  },
  {
    id: "about-page",
    title: "Kiadóról oldal",
    summary: "Bemutatkozó szöveg és szerkesztőségi hitvallás",
    status: "Draft",
  },
  {
    id: "contact-page",
    title: "Kapcsolat oldal",
    summary: "Kapcsolati adatok, nyitvatartás, űrlap szövegezése",
    status: "Published",
  },
];
